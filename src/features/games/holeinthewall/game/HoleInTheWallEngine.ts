/**
 * Hole in the Wall Engine
 * Rules and state only (no rendering): waiting → countdown → walls approach
 * → each player's pose is judged on arrival → lives run out → game over.
 */

import { HOLE_IN_THE_WALL_CONFIG } from "../config/holeInTheWallConfig";
import type {
  HoleInTheWallResult,
  HoleInTheWallState,
  PlayerId,
  PoseDefinition,
} from "../types/holeInTheWall";
import { POSES } from "../utils/poses";

const PLAYERS: PlayerId[] = ["P1", "P2"];

/** What the CV pipeline reports for one player on a frame. */
export interface PlayerInput {
  /** Any pose detected for this player */
  present: boolean;
  /** Head to toe inside the frame; required before the game (re)starts */
  fullBody: boolean;
  /** Holding the current wall's pose */
  matched: boolean;
}

export type PlayerInputs = Record<PlayerId, PlayerInput>;

export type WallPhase = "APPROACH" | "RESOLVE";

export interface WallSnapshot {
  phase: WallPhase;
  /** The pose both players must strike for this wall */
  pose: PoseDefinition;
  /** 0 = far away on the horizon, 1 = at the camera */
  progress: number;
  /** Per-player verdict; null until the wall arrives */
  outcome: Record<PlayerId, boolean | null>;
}

const perPlayer = <T>(value: T): Record<PlayerId, T> => ({
  P1: value,
  P2: value,
});

export class HoleInTheWallEngine {
  private state: HoleInTheWallState = "WAITING";
  private lives = perPlayer<number>(HOLE_IN_THE_WALL_CONFIG.LIVES);
  private passed = perPlayer<number>(0);
  private holdMs = perPlayer<number>(0);
  private presenceMs = 0;
  private countdownMs = 0;
  private resolveMs = 0;
  private wall: WallSnapshot | null = null;
  private result: HoleInTheWallResult | null = null;

  private readonly config = HOLE_IN_THE_WALL_CONFIG;
  private readonly poses: PoseDefinition[];
  private readonly random: () => number;
  private lastPose: PoseDefinition | null = null;
  private onStateChange?: (state: HoleInTheWallState) => void;
  private onWallResolved?: (outcome: Record<PlayerId, boolean>) => void;

  constructor(
    poses: PoseDefinition[] = POSES,
    random: () => number = Math.random,
  ) {
    this.poses = poses;
    this.random = random;
  }

  setCallbacks(
    onStateChange: (state: HoleInTheWallState) => void,
    onWallResolved?: (outcome: Record<PlayerId, boolean>) => void,
  ) {
    this.onStateChange = onStateChange;
    this.onWallResolved = onWallResolved;
  }

  getState = () => this.state;
  getLives = () => ({ ...this.lives });
  getPassed = () => ({ ...this.passed });
  getResult = () => this.result;
  getWall = (): WallSnapshot | null => this.wall;
  getCountdownSeconds = () => Math.ceil(this.countdownMs / 1000);
  /** 0..1 progress toward the hold requirement, for the HUD ring */
  getHoldProgress = (player: PlayerId) =>
    Math.min(1, this.holdMs[player] / this.config.HOLD_MS);

  restart() {
    this.lives = perPlayer(this.config.LIVES);
    this.passed = perPlayer(0);
    this.holdMs = perPlayer(0);
    this.presenceMs = 0;
    this.wall = null;
    this.lastPose = null;
    this.result = null;
    this.setState("WAITING");
  }

  update(dt: number, input: PlayerInputs) {
    const dtMs = dt * 1000;
    switch (this.state) {
      case "WAITING":
        return this.updateWaiting(dtMs, input);
      case "COUNTDOWN":
        return this.updateCountdown(dtMs, input);
      case "PLAYING":
        return this.updatePlaying(dtMs, input);
      case "GAME_OVER":
        return;
    }
  }

  private bothFullBody(input: PlayerInputs) {
    return PLAYERS.every((p) => input[p].fullBody);
  }

  private updateWaiting(dtMs: number, input: PlayerInputs) {
    this.presenceMs = this.bothFullBody(input) ? this.presenceMs + dtMs : 0;
    if (this.presenceMs >= this.config.PRESENCE_MS) {
      this.countdownMs = this.config.COUNTDOWN_MS;
      this.setState("COUNTDOWN");
    }
  }

  private updateCountdown(dtMs: number, input: PlayerInputs) {
    if (!this.bothFullBody(input)) {
      this.presenceMs = 0;
      this.setState("WAITING");
      return;
    }
    this.countdownMs -= dtMs;
    if (this.countdownMs <= 0) {
      this.spawnWall();
      this.setState("PLAYING");
    }
  }

  private updatePlaying(dtMs: number, input: PlayerInputs) {
    const wall = this.wall;
    if (!wall) return;

    if (wall.phase === "APPROACH") {
      for (const p of PLAYERS) {
        this.holdMs[p] =
          input[p].present && input[p].matched ? this.holdMs[p] + dtMs : 0;
      }
      wall.progress = Math.min(
        1,
        wall.progress + dtMs / this.config.WALL_DURATION_MS,
      );
      if (wall.progress >= 1) this.judgeWall();
      return;
    }

    this.resolveMs -= dtMs;
    if (this.resolveMs > 0) return;

    if (PLAYERS.some((p) => this.lives[p] <= 0)) {
      this.finish();
    } else {
      this.spawnWall();
    }
  }

  /** First wall is poses[0]; after that a random pose that differs from the last. */
  private nextPose(): PoseDefinition {
    if (!this.lastPose) return this.poses[0];
    const others = this.poses.filter((p) => p !== this.lastPose);
    if (others.length === 0) return this.lastPose;
    return others[Math.floor(this.random() * others.length)];
  }

  private spawnWall() {
    this.holdMs = perPlayer(0);
    this.lastPose = this.nextPose();
    this.wall = {
      phase: "APPROACH",
      pose: this.lastPose,
      progress: 0,
      outcome: { P1: null, P2: null },
    };
  }

  private judgeWall() {
    const wall = this.wall;
    if (!wall) return;

    const verdict = perPlayer(false);
    for (const p of PLAYERS) {
      const cleared = this.holdMs[p] >= this.config.HOLD_MS;
      verdict[p] = cleared;
      wall.outcome[p] = cleared;
      if (cleared) this.passed[p] += 1;
      else this.lives[p] -= 1;
    }
    wall.phase = "RESOLVE";
    this.resolveMs = this.config.RESOLVE_MS;
    this.onWallResolved?.(verdict);
  }

  private finish() {
    const dead = PLAYERS.filter((p) => this.lives[p] <= 0);
    this.result =
      dead.length === PLAYERS.length
        ? "DRAW"
        : dead[0] === "P1"
          ? "P2"
          : "P1";
    this.setState("GAME_OVER");
  }

  private setState(state: HoleInTheWallState) {
    if (this.state === state) return;
    this.state = state;
    this.onStateChange?.(state);
  }
}
