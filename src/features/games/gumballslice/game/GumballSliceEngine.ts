/**
 * Gumball Slice Engine
 * PixiJS game loop: fingertip input, slash trail, candy waves, slicing,
 * pooled effects (halves, particles, pop-ups) and screen shake.
 *
 * Input is read from the shared HandTrackSample written by useCvCursor, once
 * per new inference. Everything else runs on the Pixi ticker at the display's
 * refresh rate; the trail head is always the latest raw fingertip.
 */

import { Application, Container, Graphics, Text, TextStyle, type Texture, type Ticker } from "pixi.js";
import type { HandTrackSample } from "@/core/cv/cursor";
import { typography } from "@/shared/theme/typography";
import { GUMBALL_SLICE_CONFIG } from "../config/gumballSliceConfig";
import { ComboTracker } from "../logic/ComboTracker";
import { PlayerLock } from "../logic/PlayerLock";
import { SlashTrail, type TrailPoint } from "../logic/SlashTrail";
import { segmentHitsCircle, segmentSpeed } from "../logic/sliceGeometry";
import { planArc } from "../logic/trajectory";
import { isBadItem, isSuspenseWave, pickItemKind, pickSuspenseKind, planWave } from "../logic/waves";
import type { HudSnapshot, ItemKind, RoundEndReason, RoundStats } from "../types/gumballSlice";
import { buildArt, destroyArt, type ArtSet, type ItemArt } from "./candyArt";
import { PieceView } from "./PieceView";

export interface GumballSliceCallbacks {
  onHud: (hud: HudSnapshot) => void;
  onRoundEnd: (stats: RoundStats, reason: RoundEndReason) => void;
}

type EngineState = "IDLE" | "PLAYING" | "ENDED";

interface Body<V extends Container = PieceView> {
  view: V;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  active: boolean;
}

interface Item extends Body {
  kind: ItemKind;
  art: ItemArt;
  timeScale: number;
}

interface Particle extends Body<Graphics> {
  life: number;
  maxLife: number;
}

interface Popup {
  view: Text;
  x: number;
  y: number;
  life: number;
  scale: number;
  active: boolean;
}

interface PendingLaunch {
  at: number;
  kind: ItemKind;
  speed: number;
}

const POPUP_LIFE_SEC = 0.85;
// Trail passes, outermost first: [width multiplier, colour, alpha]
const TRAIL_PASSES = [
  [2.6, GUMBALL_SLICE_CONFIG.TRAIL_GLOW_COLOR, 0.22],
  [1.5, GUMBALL_SLICE_CONFIG.TRAIL_GLOW_COLOR, 0.55],
  [0.6, GUMBALL_SLICE_CONFIG.TRAIL_CORE_COLOR, 1],
] as const;

function catmullRom(p0: number, p1: number, p2: number, p3: number, u: number): number {
  const u2 = u * u;
  return (
    0.5 *
    (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (3 * p1 - p0 - 3 * p2 + p3) * u2 * u)
  );
}

export class GumballSliceEngine {
  private readonly config = GUMBALL_SLICE_CONFIG;
  private readonly app: Application;
  private readonly getSample: () => HandTrackSample;
  private readonly callbacks: GumballSliceCallbacks;

  private readonly width: number;
  private readonly height: number;
  private readonly radius: number;
  private readonly hitRadius: number;
  private readonly gravity: number;
  private readonly speedScale: number;

  private readonly world = new Container();
  private readonly trailGfx = new Graphics();
  private readonly cursorDot = new Graphics();
  private readonly art: ArtSet;
  private readonly items: Item[] = [];
  private readonly halves: Body[] = [];
  private readonly teaseGfx = new Graphics();
  private teaseText!: Text;
  private readonly particles: Particle[] = [];
  private readonly popups: Popup[] = [];
  private halfCursor = 0;
  private particleCursor = 0;
  private popupCursor = 0;

  private readonly trail: SlashTrail;
  private readonly combo: ComboTracker;
  private readonly lock: PlayerLock;
  private locked = false;
  private lockOnNextHand = false;

  // Latest accepted fingertip sample (raw)
  private lastFrameId = -1;
  private hasTip = false;
  private tipX = 0;
  private tipY = 0;
  private tipT = 0;

  private state: EngineState = "IDLE";
  private trailVisible = false;
  private elapsed = 0;
  private nextWaveAt = 0;
  private waveIndex = 0;
  private pending: PendingLaunch[] = [];
  // Suspense beat (round seconds; -1 when none is scheduled)
  private teaseAt = -1;
  private revealAt = -1;
  private suspenseX = 0;
  private score = 0;
  private sliced = 0;
  private missed = 0;
  private broccoliHits = 0;
  private strikeOutAt = -1; // round seconds; -1 until the last strike
  private bestCombo = 0;
  private lastSliceX = 0;
  private lastSliceY = 0;
  private playerMissing = false;
  private shakeUntil = 0;
  private shakeAmp = 0;
  private hud: HudSnapshot | null = null;

  // Reused per-frame trail buffers
  private readonly rx: number[] = [];
  private readonly ry: number[] = [];
  private readonly rf: number[] = [];
  private readonly nx: number[] = [];
  private readonly ny: number[] = [];

  private readonly tick = (ticker: Ticker) => this.update(ticker);

  constructor(
    app: Application,
    getSample: () => HandTrackSample,
    callbacks: GumballSliceCallbacks,
    broccoliTexture: Texture,
  ) {
    const c = this.config;
    this.app = app;
    this.getSample = getSample;
    this.callbacks = callbacks;

    this.width = app.screen.width;
    this.height = app.screen.height;
    this.radius = c.CANDY_RADIUS * this.height;
    this.hitRadius =
      this.radius * c.HITBOX_SCALE * (c.SEATED_MODE ? c.SEATED_HITBOX_FACTOR : 1);
    this.gravity = c.GRAVITY * this.height;
    this.speedScale = c.CANDY_SPEED_MULTIPLIER * (c.SEATED_MODE ? c.SEATED_SPEED_FACTOR : 1);

    this.trail = new SlashTrail(c.TRAIL_CAPACITY, c.TRAIL_LIFETIME_MS, c.TRAIL_SMOOTHING);
    this.combo = new ComboTracker(c.SWIPE_END_MS);
    this.lock = new PlayerLock({
      minScaleRatio: c.LOCK_MIN_SCALE_RATIO,
      maxJump: c.LOCK_MAX_JUMP,
      jumpWindowMs: c.LOCK_JUMP_WINDOW_MS,
      scaleAdapt: c.LOCK_SCALE_ADAPT,
    });
    this.art = buildArt(this.radius, c, broccoliTexture);

    this.buildPools();

    const dotRadius = c.CURSOR_DOT_RADIUS * this.height;
    this.cursorDot
      .circle(0, 0, dotRadius * 1.8)
      .fill({ color: c.TRAIL_GLOW_COLOR, alpha: 0.35 })
      .circle(0, 0, dotRadius)
      .fill({ color: c.TRAIL_CORE_COLOR });
    this.cursorDot.visible = false;
    this.trailGfx.blendMode = "add";

    app.stage.addChild(this.world, this.trailGfx, this.cursorDot);
    app.ticker.add(this.tick);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  setTrailVisible(visible: boolean): void {
    this.trailVisible = visible;
    if (!visible) this.trail.clear();
  }

  /**
   * Lock input to the hand that started the round (the one that tapped Ready).
   * With no hand in view yet, the first hand seen is locked instead.
   */
  lockPlayer(hand: HandTrackSample | null): void {
    this.locked = hand !== null;
    this.lockOnNextHand = hand === null;
    if (hand) this.lock.lock(hand);
  }

  startRound(): void {
    this.clearField();
    this.combo.end();
    this.state = "PLAYING";
    this.elapsed = 0;
    this.nextWaveAt = this.config.FIRST_WAVE_DELAY_SEC;
    this.waveIndex = 0;
    this.score = 0;
    this.sliced = 0;
    this.missed = 0;
    this.broccoliHits = 0;
    this.strikeOutAt = -1;
    this.bestCombo = 0;
    this.playerMissing = false;
    this.lock.touch(performance.now());
  }

  /** Back to idle (start screen): unlock the player and clear the field. */
  reset(): void {
    this.state = "IDLE";
    this.locked = false;
    this.lockOnNextHand = false;
    this.playerMissing = false;
    this.elapsed = 0;
    this.combo.end();
    this.clearField();
  }

  destroy(): void {
    this.app.ticker.remove(this.tick);
    this.world.destroy({ children: true });
    this.trailGfx.destroy();
    this.cursorDot.destroy();
    destroyArt(this.art);
  }

  // ---------------------------------------------------------------------------
  // Frame
  // ---------------------------------------------------------------------------

  private update(ticker: Ticker): void {
    const now = performance.now();
    const dt = Math.min(ticker.deltaMS / 1000, 0.05);

    this.readInput(now);
    if (this.state === "PLAYING") this.updateRound(dt, now);

    this.drawTease();
    this.updateItems(dt);
    this.updateHalves(dt);
    this.updateParticles(dt);
    this.updatePopups(dt);
    this.updateShake(now);
    this.drawTrail(now);
    this.emitHud();
  }

  private readInput(now: number): void {
    const c = this.config;
    const sample = this.getSample();

    if (sample.frameId !== this.lastFrameId) {
      this.lastFrameId = sample.frameId;
      if (this.lockOnNextHand && sample.detected) {
        this.lock.lock(sample);
        this.locked = true;
        this.lockOnNextHand = false;
      }
      const accepted =
        sample.detected &&
        now - sample.timestamp <= c.SAMPLE_STALE_MS &&
        (!this.locked || this.lock.accept(sample));
      if (accepted) {
        this.onTip(sample.tipX, sample.tipY, sample.timestamp);
        return;
      }
      this.hasTip = false;
    }

    if (this.hasTip && now - this.tipT > c.SAMPLE_STALE_MS) this.hasTip = false;
    if (!this.hasTip) this.finishSwipe(this.combo.update(now, false));
  }

  private onTip(x: number, y: number, t: number): void {
    const continues = this.hasTip && t - this.tipT <= this.config.STROKE_GAP_MS;
    this.trail.push(x, y, t, !continues);

    let fast = false;
    if (continues) {
      const speed = segmentSpeed(this.tipX, this.tipY, x, y, t - this.tipT, this.height);
      fast = speed >= this.config.SLICE_SPEED_THRESHOLD;
      if (fast && this.state === "PLAYING") this.sliceAlong(this.tipX, this.tipY, x, y);
    }
    this.finishSwipe(this.combo.update(t, fast));

    this.hasTip = true;
    this.tipX = x;
    this.tipY = y;
    this.tipT = t;
  }

  private updateRound(dt: number, now: number): void {
    const c = this.config;
    this.elapsed += dt;

    // Struck out: hold briefly so the last X and broccoli burst are seen.
    if (this.strikeOutAt >= 0) {
      if (this.elapsed >= this.strikeOutAt) this.endRound("STRUCK_OUT");
      return;
    }

    const missingMs = this.lock.msSinceSeen(now);
    this.playerMissing = missingMs >= c.PLAYER_LOST_WARNING_MS;
    if (missingMs >= c.PLAYER_LOST_TIMEOUT_MS) {
      this.endRound("PLAYER_LOST");
      return;
    }
    if (this.elapsed >= c.ROUND_SECONDS) {
      this.endRound("TIME_UP");
      return;
    }

    const timeLeft = c.ROUND_SECONDS - this.elapsed;
    const suspenseSec = c.SUSPENSE_LULL_SEC + c.SUSPENSE_TEASE_SEC;
    if (
      this.elapsed >= this.nextWaveAt &&
      isSuspenseWave(this.waveIndex, c) &&
      timeLeft - suspenseSec > c.NO_LAUNCH_FINAL_SEC + c.SUSPENSE_AFTER_SEC
    ) {
      this.teaseAt = this.elapsed + c.SUSPENSE_LULL_SEC;
      this.revealAt = this.elapsed + suspenseSec;
      this.suspenseX = this.width * (0.3 + Math.random() * 0.4);
      this.waveIndex += 1;
      this.nextWaveAt = this.revealAt + c.SUSPENSE_AFTER_SEC;
    } else if (this.elapsed >= this.nextWaveAt && timeLeft > c.NO_LAUNCH_FINAL_SEC) {
      const plan = planWave(this.waveIndex, c);
      for (let k = 0; k < plan.count; k++) {
        this.pending.push({
          at: this.elapsed + k * c.LAUNCH_STAGGER_SEC,
          kind: pickItemKind(this.waveIndex, c),
          speed: plan.speed,
        });
      }
      this.waveIndex += 1;
      this.nextWaveAt = this.elapsed + plan.nextInSec;
    }

    if (this.revealAt >= 0 && this.elapsed >= this.revealAt) {
      // Slow-motion, straight up from the glow, so the mystery item hangs in the air.
      this.launch(pickSuspenseKind(c), c.SUSPENSE_SLOWMO, this.suspenseX);
      this.teaseAt = -1;
      this.revealAt = -1;
    }

    // Oldest launches first; anything over the on-screen cap waits its turn.
    let airborne = this.items.reduce((n, item) => n + (item.active ? 1 : 0), 0);
    for (let i = 0; i < this.pending.length && airborne < c.MAX_ITEMS_ON_SCREEN; ) {
      const launch = this.pending[i];
      if (launch.at <= this.elapsed) {
        this.launch(launch.kind, launch.speed);
        this.pending.splice(i, 1);
        airborne += 1;
      } else {
        i += 1;
      }
    }
  }

  /** Pulsing glow and "?" at the bottom edge where the mystery item will appear. */
  private drawTease(): void {
    const g = this.teaseGfx;
    g.clear();
    const teasing = this.state === "PLAYING" && this.teaseAt >= 0 && this.elapsed >= this.teaseAt;
    this.teaseText.visible = teasing;
    if (!teasing) return;

    const p = Math.min(1, (this.elapsed - this.teaseAt) / this.config.SUSPENSE_TEASE_SEC);
    const pulse = 1 + 0.15 * Math.sin(this.elapsed * (8 + 14 * p));
    const r = this.radius * (1 + 1.2 * p) * pulse;
    const x = this.suspenseX;
    const y = this.height;
    g.circle(x, y, r * 1.8).fill({ color: this.config.TRAIL_GLOW_COLOR, alpha: 0.12 + 0.18 * p });
    g.circle(x, y, r * 1.2).fill({ color: this.config.TRAIL_GLOW_COLOR, alpha: 0.2 + 0.3 * p });
    g.circle(x, y, r * 0.6).fill({ color: this.config.TRAIL_CORE_COLOR, alpha: 0.3 + 0.5 * p });

    this.teaseText.position.set(x, y - r * 1.9);
    this.teaseText.alpha = p;
    this.teaseText.scale.set(1.2 * pulse);
  }

  private endRound(reason: RoundEndReason): void {
    // Settle a combo still in progress at the buzzer.
    this.finishSwipe(this.combo.end());
    this.state = "ENDED";
    this.playerMissing = false;
    this.pending = [];
    this.callbacks.onRoundEnd(
      {
        score: this.score,
        slicedCount: this.sliced,
        missedCount: this.missed,
        broccoliHits: this.broccoliHits,
        bestCombo: this.bestCombo,
        durationMs: Math.round(this.elapsed * 1000),
      },
      reason,
    );
  }

  private emitHud(): void {
    const next: HudSnapshot = {
      score: this.score,
      secondsLeft: Math.ceil(Math.max(0, this.config.ROUND_SECONDS - this.elapsed)),
      slicedCount: this.sliced,
      broccoliHits: this.broccoliHits,
      comboCount: this.combo.current,
      playerMissing: this.playerMissing,
    };
    const prev = this.hud;
    if (
      prev &&
      prev.score === next.score &&
      prev.secondsLeft === next.secondsLeft &&
      prev.slicedCount === next.slicedCount &&
      prev.broccoliHits === next.broccoliHits &&
      prev.comboCount === next.comboCount &&
      prev.playerMissing === next.playerMissing
    ) {
      return;
    }
    this.hud = next;
    this.callbacks.onHud(next);
  }

  // ---------------------------------------------------------------------------
  // Items & slicing
  // ---------------------------------------------------------------------------

  /** Launch an item; with `straightUpX` it rises vertically from that point. */
  private launch(kind: ItemKind, waveSpeed: number, straightUpX?: number): void {
    const item = this.items.find((i) => !i.active);
    if (!item) return;
    const c = this.config;
    const H = this.height;

    const variants = this.art.variants[kind];
    item.art = variants[Math.floor(Math.random() * variants.length)];
    item.kind = kind;
    item.view.show(item.art.whole);

    const arc = planArc(c, this.width, H, Math.random, straightUpX);
    const startY = H + this.radius * 1.4;
    item.x = arc.launchX;
    item.y = startY;
    item.vy = -Math.sqrt(2 * this.gravity * (startY - arc.apexY));
    // Reach the planned peak exactly at the top of the arc.
    item.vx = (arc.apexX - arc.launchX) / (-item.vy / this.gravity);
    item.timeScale = waveSpeed * this.speedScale;
    if (isBadItem(kind)) {
      // Broccoli stays upright-ish so it's recognisable at a glance.
      item.spin = (Math.random() * 2 - 1) * c.BROCCOLI_WOBBLE;
      item.view.rotation = (Math.random() - 0.5) * 0.4;
    } else {
      item.spin = (Math.random() - 0.5) * 4;
      item.view.rotation = Math.random() * Math.PI * 2;
    }
    item.view.position.set(item.x, item.y);
    item.view.visible = true;
    item.active = true;
  }

  private updateItems(dt: number): void {
    const bottom = this.height + this.radius * 1.5;
    for (const item of this.items) {
      if (!item.active) continue;
      const s = dt * item.timeScale;
      item.vy += this.gravity * s;
      item.x += item.vx * s;
      item.y += item.vy * s;
      item.view.rotation += item.spin * s;
      item.view.position.set(item.x, item.y);

      if (item.vy > 0 && item.y > bottom) {
        item.active = false;
        item.view.visible = false;
        if (this.state === "PLAYING" && !isBadItem(item.kind)) this.missed += 1;
      }
    }
  }

  private sliceAlong(ax: number, ay: number, bx: number, by: number): void {
    const angle = Math.atan2(by - ay, bx - ax);
    for (const item of this.items) {
      if (this.strikeOutAt >= 0) return;
      if (item.active && segmentHitsCircle(ax, ay, bx, by, item.x, item.y, this.hitRadius)) {
        this.slice(item, angle);
      }
    }
  }

  private slice(item: Item, angle: number): void {
    const c = this.config;
    item.active = false;
    item.view.visible = false;
    this.spawnHalves(item, angle);
    this.burst(item.x, item.y, item.art.particleColor, item.kind === "golden" ? 2 : 1);

    if (isBadItem(item.kind)) {
      this.broccoliHits += 1;
      this.score = Math.max(0, this.score + c.BAD_POINTS);
      this.popup(`${c.BAD_POINTS}`, item.x, item.y, c.POPUP_BAD_COLOR, 1.1);
      if (this.broccoliHits >= c.BROCCOLI_STRIKES) {
        this.strikeOutAt = this.elapsed + c.STRIKEOUT_DELAY_SEC;
        this.pending = [];
        this.shake(1.2);
      } else {
        this.shake(0.6);
      }
      return;
    }

    const golden = item.kind === "golden";
    const points = golden ? c.GOLDEN_POINTS : c.CANDY_POINTS;
    this.score += points;
    this.sliced += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo.addSlice());
    this.lastSliceX = item.x;
    this.lastSliceY = item.y;
    this.popup(`+${points}`, item.x, item.y, golden ? c.POPUP_GOLDEN_COLOR : c.POPUP_GOOD_COLOR, golden ? 1.4 : 1);
    if (golden) this.shake(0.5);
  }

  private finishSwipe(count: number): void {
    const c = this.config;
    if (this.state !== "PLAYING" || count < c.COMBO_MIN) return;
    const bonus = count * c.COMBO_POINTS_PER_CANDY;
    this.score += bonus;
    this.popup(
      `${count}x COMBO +${bonus}`,
      Math.min(Math.max(this.lastSliceX, this.width * 0.2), this.width * 0.8),
      Math.max(this.lastSliceY - this.radius * 2, this.height * 0.2),
      c.POPUP_COMBO_COLOR,
      1.6,
    );
    if (count >= c.BIG_COMBO_SHAKE) this.shake(1);
  }

  private clearField(): void {
    this.pending = [];
    this.teaseAt = -1;
    this.revealAt = -1;
    for (const item of this.items) {
      item.active = false;
      item.view.visible = false;
    }
    for (const half of this.halves) {
      half.active = false;
      half.view.visible = false;
    }
    for (const p of this.particles) {
      p.active = false;
      p.view.visible = false;
    }
    for (const p of this.popups) {
      p.active = false;
      p.view.visible = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Effects (pooled, round-robin: the oldest effect is recycled first)
  // ---------------------------------------------------------------------------

  private buildPools(): void {
    const c = this.config;
    const itemLayer = new Container();
    const halfLayer = new Container();
    const particleLayer = new Container();
    const popupLayer = new Container();
    this.world.addChild(this.teaseGfx, halfLayer, itemLayer, particleLayer, popupLayer);

    const body = <V extends Container>(view: V) => ({ view, x: 0, y: 0, vx: 0, vy: 0, spin: 0, active: false });

    for (let i = 0; i < c.ITEM_POOL_SIZE; i++) {
      const view = new PieceView();
      view.visible = false;
      itemLayer.addChild(view);
      this.items.push({
        ...body(view),
        kind: "gumball",
        art: this.art.variants.gumball[0],
        timeScale: 1,
      });
    }
    for (let i = 0; i < c.HALF_POOL_SIZE; i++) {
      const view = new PieceView();
      view.visible = false;
      halfLayer.addChild(view);
      this.halves.push(body(view));
    }
    for (let i = 0; i < c.PARTICLE_POOL_SIZE; i++) {
      const view = new Graphics(this.art.dot);
      view.visible = false;
      particleLayer.addChild(view);
      this.particles.push({ ...body(view), life: 0, maxLife: 1 });
    }

    const style = new TextStyle({
      fontFamily: typography.font.jersey,
      fontSize: Math.round(this.height * 0.07),
      fill: c.POPUP_GOOD_COLOR,
      stroke: { width: Math.max(4, Math.round(this.height * 0.008)), color: c.OUTLINE_BAD },
      letterSpacing: 2,
    });
    for (let i = 0; i < c.POPUP_POOL_SIZE; i++) {
      const view = new Text({ text: "", style });
      view.anchor.set(0.5);
      view.visible = false;
      popupLayer.addChild(view);
      this.popups.push({ view, x: 0, y: 0, life: 0, scale: 1, active: false });
    }

    this.teaseText = new Text({ text: "?", style });
    this.teaseText.anchor.set(0.5);
    this.teaseText.tint = c.POPUP_GOLDEN_COLOR;
    this.teaseText.visible = false;
    popupLayer.addChild(this.teaseText);
  }

  private spawnHalves(item: Item, angle: number): void {
    // Outward normal of the top half once rotated by `angle`.
    const ox = Math.sin(angle);
    const oy = -Math.cos(angle);
    const separation = this.height * 0.45;

    for (const side of [1, -1]) {
      const half = this.halves[this.halfCursor];
      this.halfCursor = (this.halfCursor + 1) % this.halves.length;
      half.view.show(item.art.halves[side === 1 ? 0 : 1]);
      half.view.rotation = side === 1 ? angle : angle + Math.PI;
      half.x = item.x;
      half.y = item.y;
      half.vx = item.vx * item.timeScale * 0.4 + ox * side * separation;
      half.vy = item.vy * item.timeScale * 0.4 + oy * side * separation - this.height * 0.15;
      half.spin = side * (2 + Math.random() * 3);
      half.view.position.set(half.x, half.y);
      half.view.visible = true;
      half.active = true;
    }
  }

  private updateHalves(dt: number): void {
    const bottom = this.height + this.radius * 2;
    for (const half of this.halves) {
      if (!half.active) continue;
      half.vy += this.gravity * dt;
      half.x += half.vx * dt;
      half.y += half.vy * dt;
      half.view.rotation += half.spin * dt;
      half.view.position.set(half.x, half.y);
      if (half.y > bottom) {
        half.active = false;
        half.view.visible = false;
      }
    }
  }

  /** Sugar burst: coloured crumbs plus white sugar specks. */
  private burst(x: number, y: number, color: string, strength: number): void {
    const H = this.height;
    const count = Math.round(this.config.PARTICLES_PER_SLICE * strength);
    for (let k = 0; k < count; k++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % this.particles.length;

      const speck = k % 3 === 0;
      p.view.context = speck ? this.art.speck : this.art.dot;
      p.view.tint = speck ? this.config.TRAIL_CORE_COLOR : color;
      const dir = Math.random() * Math.PI * 2;
      const speed = H * (0.25 + Math.random() * 0.65);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(dir) * speed;
      p.vy = Math.sin(dir) * speed - H * 0.2;
      p.spin = (Math.random() - 0.5) * 10;
      p.maxLife = 0.45 + Math.random() * 0.4;
      p.life = p.maxLife;
      p.view.scale.set(H * (0.004 + Math.random() * 0.007));
      p.view.alpha = 1;
      p.view.position.set(x, y);
      p.view.visible = true;
      p.active = true;
    }
  }

  private updateParticles(dt: number): void {
    const g = this.gravity * 0.6;
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.view.visible = false;
        continue;
      }
      p.vy += g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.view.rotation += p.spin * dt;
      p.view.position.set(p.x, p.y);
      p.view.alpha = p.life / p.maxLife;
    }
  }

  private popup(text: string, x: number, y: number, color: string, scale: number): void {
    const p = this.popups[this.popupCursor];
    this.popupCursor = (this.popupCursor + 1) % this.popups.length;
    p.view.text = text;
    p.view.tint = color;
    p.x = x;
    p.y = y;
    p.scale = scale;
    p.life = POPUP_LIFE_SEC;
    p.view.visible = true;
    p.active = true;
  }

  private updatePopups(dt: number): void {
    const rise = this.height * 0.12;
    for (const p of this.popups) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.view.visible = false;
        continue;
      }
      const age = 1 - p.life / POPUP_LIFE_SEC; // 0 → 1
      const pop = age < 0.15 ? 0.6 + (age / 0.15) * 0.55 : 1.15 - Math.min(age - 0.15, 0.15);
      p.view.scale.set(p.scale * pop);
      p.view.position.set(p.x, p.y - rise * age);
      p.view.alpha = age > 0.6 ? 1 - (age - 0.6) / 0.4 : 1;
    }
  }

  private shake(strength: number): void {
    this.shakeUntil = performance.now() + this.config.SHAKE_MS;
    this.shakeAmp = Math.max(this.shakeAmp, this.height * this.config.SHAKE_AMPLITUDE * strength);
  }

  private updateShake(now: number): void {
    if (now >= this.shakeUntil) {
      this.shakeAmp = 0;
      this.world.position.set(0, 0);
      return;
    }
    const k = (this.shakeUntil - now) / this.config.SHAKE_MS;
    const amp = this.shakeAmp * k;
    this.world.position.set((Math.random() * 2 - 1) * amp, (Math.random() * 2 - 1) * amp);
  }

  // ---------------------------------------------------------------------------
  // Slash trail
  // ---------------------------------------------------------------------------

  private drawTrail(now: number): void {
    const g = this.trailGfx;
    g.clear();

    this.cursorDot.visible = this.trailVisible && this.hasTip;
    if (this.cursorDot.visible) this.cursorDot.position.set(this.tipX, this.tipY);
    if (!this.trailVisible) return;

    const points = this.trail.getAlive(now);
    let runStart = 0;
    for (let i = 1; i <= points.length; i++) {
      if (i === points.length || points[i].stroke !== points[runStart].stroke) {
        this.drawRun(g, points, runStart, i - 1, now);
        runStart = i;
      }
    }
  }

  /** Tapered ribbon through points[first..last] (one stroke). */
  private drawRun(g: Graphics, points: readonly TrailPoint[], first: number, last: number, now: number): void {
    const { rx, ry, rf, nx, ny } = this;
    rx.length = ry.length = rf.length = nx.length = ny.length = 0;

    // Catmull-Rom through the samples: the curve passes through every raw
    // point, so it smooths the line without dragging the head behind.
    const sub = this.config.TRAIL_SUBDIVISIONS;
    for (let j = first; j < last; j++) {
      const p0 = points[Math.max(j - 1, first)];
      const p1 = points[j];
      const p2 = points[j + 1];
      const p3 = points[Math.min(j + 2, last)];
      for (let s = 0; s < sub; s++) {
        const u = s / sub;
        rx.push(catmullRom(p0.x, p1.x, p2.x, p3.x, u));
        ry.push(catmullRom(p0.y, p1.y, p2.y, p3.y, u));
        rf.push(this.trail.fadeAt(p1.t + (p2.t - p1.t) * u, now));
      }
    }
    rx.push(points[last].x);
    ry.push(points[last].y);
    rf.push(this.trail.fadeAt(points[last].t, now));

    const n = rx.length;
    for (let k = 0; k < n; k++) {
      const a = Math.max(k - 1, 0);
      const b = Math.min(k + 1, n - 1);
      const tx = rx[b] - rx[a];
      const ty = ry[b] - ry[a];
      const len = Math.hypot(tx, ty) || 1;
      nx.push(-ty / len);
      ny.push(tx / len);
    }

    const maxWidth = this.config.TRAIL_WIDTH * this.height;
    for (const [widthMul, color, alpha] of TRAIL_PASSES) {
      const half = (maxWidth * widthMul) / 2;
      for (let k = 0; k < n - 1; k++) {
        const w0 = half * rf[k];
        const w1 = half * rf[k + 1];
        if (w1 <= 0) continue;
        g.moveTo(rx[k] + nx[k] * w0, ry[k] + ny[k] * w0)
          .lineTo(rx[k + 1] + nx[k + 1] * w1, ry[k + 1] + ny[k + 1] * w1)
          .lineTo(rx[k + 1] - nx[k + 1] * w1, ry[k + 1] - ny[k + 1] * w1)
          .lineTo(rx[k] - nx[k] * w0, ry[k] - ny[k] * w0)
          .closePath()
          .fill({ color, alpha: (alpha * (rf[k] + rf[k + 1])) / 2 });
      }
      // Rounded head
      const headWidth = half * rf[n - 1];
      if (headWidth > 0) {
        g.circle(rx[n - 1], ry[n - 1], headWidth).fill({ color, alpha: alpha * rf[n - 1] });
      }
    }
  }
}
