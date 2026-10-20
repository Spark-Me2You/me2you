/**
 * Hole in the Wall Configuration
 * Colors mirror brand hex values (brand book §9) because Pixi can't read CSS tokens.
 */

export const HOLE_IN_THE_WALL_CONFIG = {
  // Stage matches the 4:3 camera frame so landmarks map 1:1 onto the canvas
  GAME_WIDTH: 1200,
  GAME_HEIGHT: 900,
  CAMERA_ASPECT: 4 / 3,

  PLAYERS: {
    P1: { COLOR: 0xe405ac, CSS_COLOR: "var(--color-magenta)" }, // magenta
    P2: { COLOR: 0xe44805, CSS_COLOR: "var(--color-orange)" }, // orange
  },

  // Pose detection
  NUM_POSES: 2,
  // Normalized x of the camera split line (raw, un-mirrored frame coordinates)
  SPLIT_X: 0.5,
  MIN_LANDMARK_VISIBILITY: 0.5,

  // Rules
  LIVES: 3,
  COUNTDOWN_MS: 3000,
  /** Both players must be detected this long before the countdown starts */
  PRESENCE_MS: 800,
  /** Time for a wall to travel from the horizon to the camera */
  WALL_DURATION_MS: 5000,
  /** The pose must be held continuously for this long up to the moment of arrival */
  HOLD_MS: 600,
  /** How long the result of a wall stays on screen before the next one spawns */
  RESOLVE_MS: 1200,

  // Wall visuals (placeholder)
  WALL_START_SCALE: 0.12,
  WALL_COLOR: 0x5a5a6e,
  WALL_EDGE_COLOR: 0xfefffb,
  HOLE_WIDTH: 0.8, // fraction of a camera half
  HOLE_HEIGHT: 0.7, // fraction of stage height
  SKELETON_WIDTH: 6,
} as const;
