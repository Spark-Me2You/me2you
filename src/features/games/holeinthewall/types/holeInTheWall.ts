/**
 * Hole in the Wall Types
 */

/** P1 plays on the left half of the (mirrored) camera, P2 on the right. */
export type PlayerId = "P1" | "P2";

export type HoleInTheWallState =
  | "WAITING"
  | "COUNTDOWN"
  | "PLAYING"
  | "GAME_OVER";

/** Winner of the match, or DRAW if both players ran out of lives on the same wall. */
export type HoleInTheWallResult = PlayerId | "DRAW";

/** A joint angle (degrees) measured at `vertex` between the rays to `a` and `c`. */
export interface JointTarget {
  name: string;
  a: number;
  vertex: number;
  c: number;
  /** Target angle in degrees */
  angle: number;
  /** Allowed deviation in degrees */
  tolerance: number;
}

export interface PoseDefinition {
  id: string;
  label: string;
  joints: JointTarget[];
}

export interface PoseMatch {
  /** True when every required joint is visible and within tolerance */
  matched: boolean;
  /** 0..1 closeness, for feedback only */
  score: number;
  /** Names of joints outside tolerance (or not visible) */
  failing: string[];
}
