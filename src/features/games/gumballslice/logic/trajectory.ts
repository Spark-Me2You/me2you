/**
 * Trajectory planning
 * Every item's arc peaks inside a comfortable "reach zone" in the middle of
 * the screen: never in the top corners, behind the HUD, or skimming the
 * bottom edge, which are hard to reach with a hand in front of a TV.
 */

import type { GumballSliceConfig } from "../config/gumballSliceConfig";

export interface ArcPlan {
  launchX: number; // px, where the item enters from below the screen
  apexX: number; // px, horizontal position at the top of the arc
  apexY: number; // px from the top of the screen
}

/** Pick an arc that peaks somewhere inside the reach zone. */
export function planArc(
  config: GumballSliceConfig,
  width: number,
  height: number,
  random: () => number = Math.random,
): ArcPlan {
  const minX = width * config.REACH_X_MIN;
  const maxX = width * config.REACH_X_MAX;
  const apexY = height * (config.REACH_Y_MIN + random() * (config.REACH_Y_MAX - config.REACH_Y_MIN));

  const apexX = minX + random() * (maxX - minX);
  // Enter a little to either side of the apex, so arcs lean but stay central.
  const offset = (random() * 2 - 1) * width * config.LAUNCH_X_SPREAD;
  return { launchX: apexX + offset, apexX, apexY };
}
