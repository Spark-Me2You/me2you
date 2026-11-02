/**
 * FlapFlap 4P Game Configuration
 * Physics and pipes are shared with FLAPFLAP_CONFIG; only 4P-specific values live here.
 */

import { FLAPFLAP_CONFIG } from "../../flapflap/config/flapflapConfig";

const MID = FLAPFLAP_CONFIG.GAME_HEIGHT / 2;

export const FLAPFLAP_4P_CONFIG = {
  PLAYERS: {
    P1: { COLOR: 0xffd700, CSS_COLOR: "#ffd700", START_Y: MID - 120 }, // gold
    P2: { COLOR: 0x3b9dff, CSS_COLOR: "#3b9dff", START_Y: MID - 40 }, // blue
    P3: { COLOR: 0xe405ac, CSS_COLOR: "#e405ac", START_Y: MID + 40 }, // brand magenta
    P4: { COLOR: 0xe44805, CSS_COLOR: "#e44805", START_Y: MID + 120 }, // brand orange
  },

  MIN_PLAYERS: 2,

  // Pose detection
  NUM_POSES: 4,
  // Normalized x of the camera split lines (raw, un-mirrored frame coordinates)
  SPLIT_XS: [0.25, 0.5, 0.75],
} as const;
