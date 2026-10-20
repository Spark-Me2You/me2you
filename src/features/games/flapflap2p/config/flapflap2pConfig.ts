/**
 * FlapFlap 2P Game Configuration
 * Physics and pipes are shared with FLAPFLAP_CONFIG; only 2P-specific values live here.
 */

import { FLAPFLAP_CONFIG } from "../../flapflap/config/flapflapConfig";

export const FLAPFLAP_2P_CONFIG = {
  PLAYERS: {
    P1: {
      COLOR: 0xe405ac, // magenta, same as the 1P bird
      CSS_COLOR: "var(--color-magenta)",
      START_Y: FLAPFLAP_CONFIG.GAME_HEIGHT / 2 - 60,
    },
    P2: {
      COLOR: 0xe44805, // orange
      CSS_COLOR: "var(--color-orange)",
      START_Y: FLAPFLAP_CONFIG.GAME_HEIGHT / 2 + 20,
    },
  },

  // Pose detection
  NUM_POSES: 2,
  // Normalized x of the camera split line (in raw, un-mirrored frame coordinates)
  SPLIT_X: 0.5,
} as const;
