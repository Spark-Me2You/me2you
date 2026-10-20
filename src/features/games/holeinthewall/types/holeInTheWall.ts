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

/**
 * The body shape a pose describes. Both the joint targets used for matching
 * and the hole silhouette are derived from this, so they can't drift apart.
 * Arms and legs are straight; angles are in degrees.
 */
export interface PoseFigure {
  /** Shoulder angle of the person's left arm: 0 = hanging down, 90 = out to the side, 180 = straight up */
  leftArm: number;
  rightArm: number;
  /** Angle of each leg away from vertical: 0 = feet together */
  legSpread: number;
}

export interface PoseDefinition {
  id: string;
  label: string;
  figure: PoseFigure;
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
