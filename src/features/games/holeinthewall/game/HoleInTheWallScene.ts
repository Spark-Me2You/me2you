/**
 * Hole in the Wall Scene
 * Pixi drawing only: the approaching placeholder wall and each player's skeleton.
 * The canvas is transparent and sits over the mirrored camera feed.
 */

import { Application, Container, Graphics } from "pixi.js";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { PoseLandmark as L } from "@/shared/utils/gestureConstants";
import { HOLE_IN_THE_WALL_CONFIG } from "../config/holeInTheWallConfig";
import type { PlayerId } from "../types/holeInTheWall";
import type { WallSnapshot } from "./HoleInTheWallEngine";
import type { PlayerPoses } from "../utils/assignPlayers";

const PLAYERS: PlayerId[] = ["P1", "P2"];

const PASS_COLOR = 0xd3e405; // lime
const FAIL_COLOR = 0xe44805; // orange
const MATCH_COLOR = 0xd3e405; // lime

/** Landmark index pairs forming the drawn skeleton. */
const BONES: [number, number][] = [
  [L.LEFT_SHOULDER, L.RIGHT_SHOULDER],
  [L.LEFT_SHOULDER, L.LEFT_ELBOW],
  [L.LEFT_ELBOW, L.LEFT_WRIST],
  [L.RIGHT_SHOULDER, L.RIGHT_ELBOW],
  [L.RIGHT_ELBOW, L.RIGHT_WRIST],
  [L.LEFT_SHOULDER, L.LEFT_HIP],
  [L.RIGHT_SHOULDER, L.RIGHT_HIP],
  [L.LEFT_HIP, L.RIGHT_HIP],
  [L.LEFT_HIP, L.LEFT_KNEE],
  [L.LEFT_KNEE, L.LEFT_ANKLE],
  [L.RIGHT_HIP, L.RIGHT_KNEE],
  [L.RIGHT_KNEE, L.RIGHT_ANKLE],
];

const JOINTS = [
  L.NOSE,
  L.LEFT_SHOULDER,
  L.RIGHT_SHOULDER,
  L.LEFT_ELBOW,
  L.RIGHT_ELBOW,
  L.LEFT_WRIST,
  L.RIGHT_WRIST,
  L.LEFT_HIP,
  L.RIGHT_HIP,
  L.LEFT_KNEE,
  L.RIGHT_KNEE,
  L.LEFT_ANKLE,
  L.RIGHT_ANKLE,
];

/** Wall-local hole for the T-pose: head, torso and an arms bar, centered on (cx, 0). */
function tHolePath(g: Graphics, cx: number, w: number, h: number) {
  const top = -h / 2;
  const armsH = h * 0.2;
  const torsoW = w * 0.3;
  const headR = Math.min(w, h) * 0.11;
  g.circle(cx, top + headR, headR);
  g.rect(cx - w / 2, top + headR * 2.2, w, armsH);
  g.rect(cx - torsoW / 2, top + headR * 2.2, torsoW, h - headR * 2.2);
}

export class HoleInTheWallScene {
  private wallLayer = new Container();
  private wallGfx = new Graphics();
  private outlineGfx = new Graphics();
  private skeletonGfx = new Graphics();
  private outlineKey = "";

  private readonly config = HOLE_IN_THE_WALL_CONFIG;

  constructor(app: Application) {
    const { GAME_WIDTH: W, GAME_HEIGHT: H } = this.config;

    this.drawWall();
    this.wallLayer.addChild(this.wallGfx, this.outlineGfx);
    // Wall geometry is authored around (0,0) and scaled about the stage center.
    this.wallLayer.position.set(W / 2, H / 2);
    this.wallLayer.visible = false;

    app.stage.addChild(this.wallLayer, this.skeletonGfx);
  }

  private holeRects() {
    const { GAME_WIDTH: W, GAME_HEIGHT: H, HOLE_WIDTH, HOLE_HEIGHT } =
      this.config;
    return {
      // P1 is on the left of the mirrored screen
      P1: { cx: -W / 4, w: (W / 2) * HOLE_WIDTH, h: H * HOLE_HEIGHT },
      P2: { cx: W / 4, w: (W / 2) * HOLE_WIDTH, h: H * HOLE_HEIGHT },
    };
  }

  private drawWall() {
    const { GAME_WIDTH: W, GAME_HEIGHT: H, WALL_COLOR } = this.config;
    const holes = this.holeRects();
    const g = this.wallGfx;
    g.clear();
    g.rect(-W / 2, -H / 2, W, H).fill(WALL_COLOR);
    for (const id of PLAYERS) {
      const { cx, w, h } = holes[id];
      tHolePath(g, cx, w, h);
    }
    g.cut();
  }

  private drawOutlines(outcome: WallSnapshot["outcome"]) {
    const key = `${outcome.P1}|${outcome.P2}`;
    if (key === this.outlineKey) return;
    this.outlineKey = key;

    const holes = this.holeRects();
    const g = this.outlineGfx;
    g.clear();
    for (const id of PLAYERS) {
      const { cx, w, h } = holes[id];
      const verdict = outcome[id];
      const color =
        verdict === null
          ? this.config.PLAYERS[id].COLOR
          : verdict
            ? PASS_COLOR
            : FAIL_COLOR;
      tHolePath(g, cx, w, h);
      g.stroke({ width: 8, color });
    }
  }

  /** Perspective-correct scale: 1/z with z running from far to the camera plane. */
  private wallScale(progress: number) {
    const s0 = this.config.WALL_START_SCALE;
    return s0 / (s0 + (1 - s0) * (1 - progress));
  }

  render(
    wall: WallSnapshot | null,
    poses: PlayerPoses,
    matched: Record<PlayerId, boolean>,
  ) {
    this.wallLayer.visible = wall !== null;
    if (wall) {
      this.wallLayer.scale.set(this.wallScale(wall.progress));
      this.drawOutlines(wall.outcome);
    } else {
      this.outlineKey = "";
    }
    this.drawSkeletons(poses, matched);
  }

  private drawSkeletons(
    poses: PlayerPoses,
    matched: Record<PlayerId, boolean>,
  ) {
    const { GAME_WIDTH: W, GAME_HEIGHT: H, SKELETON_WIDTH } = this.config;
    const g = this.skeletonGfx;
    g.clear();

    for (const id of PLAYERS) {
      const lms = poses[id];
      if (!lms) continue;
      const color = matched[id] ? MATCH_COLOR : this.config.PLAYERS[id].COLOR;

      // The feed is displayed mirrored, so flip x.
      const pt = (lm: NormalizedLandmark) => ({
        x: (1 - lm.x) * W,
        y: lm.y * H,
      });
      const visible = (lm: NormalizedLandmark | undefined) =>
        !!lm && (lm.visibility ?? 1) >= this.config.MIN_LANDMARK_VISIBILITY;

      for (const [i, j] of BONES) {
        if (!visible(lms[i]) || !visible(lms[j])) continue;
        const a = pt(lms[i]);
        const b = pt(lms[j]);
        g.moveTo(a.x, a.y).lineTo(b.x, b.y);
      }
      g.stroke({ width: SKELETON_WIDTH, color, cap: "round" });

      for (const i of JOINTS) {
        if (!visible(lms[i])) continue;
        const p = pt(lms[i]);
        g.circle(p.x, p.y, SKELETON_WIDTH * 1.4);
      }
      g.fill(color);
    }
  }

  destroy() {
    this.wallLayer.destroy({ children: true });
    this.skeletonGfx.destroy();
  }
}
