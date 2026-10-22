/**
 * Wave planning
 * Waves grow in item count and speed and arrive closer together over a round.
 * Every few waves a suspense beat replaces the wave: a lull, a tease, and a
 * single slow-motion mystery item.
 */

import type { GumballSliceConfig } from "../config/gumballSliceConfig";
import type { ItemKind } from "../types/gumballSlice";

export interface WavePlan {
  count: number;
  speed: number; // multiplier on flight time-scale
  nextInSec: number; // delay until the following wave
}

export function planWave(index: number, config: GumballSliceConfig): WavePlan {
  return {
    count: Math.min(
      config.MAX_WAVE_SIZE,
      config.FIRST_WAVE_SIZE + Math.floor(index * config.WAVE_SIZE_GROWTH),
    ),
    speed: Math.min(config.MAX_WAVE_SPEED, 1 + index * config.WAVE_SPEED_GROWTH),
    nextInSec: Math.max(
      config.MIN_WAVE_INTERVAL_SEC,
      config.WAVE_INTERVAL_SEC - index * config.WAVE_INTERVAL_DECAY_SEC,
    ),
  };
}

/** Pick what to launch. The first wave is always candy so new players warm up. */
export function pickItemKind(
  waveIndex: number,
  config: GumballSliceConfig,
  random: () => number = Math.random,
): ItemKind {
  if (waveIndex > 0 && random() < config.BAD_ITEM_FREQUENCY) return "broccoli";
  if (random() < config.RAINBOW_CHANCE) return "rainbow";
  return "candy";
}

export function isSuspenseWave(waveIndex: number, config: GumballSliceConfig): boolean {
  return waveIndex > 0 && waveIndex % config.SUSPENSE_EVERY_WAVES === 0;
}

/** The mystery item: much more likely to be the rainbow bonus (or broccoli) than a normal launch. */
export function pickSuspenseKind(
  config: GumballSliceConfig,
  random: () => number = Math.random,
): ItemKind {
  const roll = random();
  if (roll < config.SUSPENSE_RAINBOW_CHANCE) return "rainbow";
  if (roll < config.SUSPENSE_RAINBOW_CHANCE + config.SUSPENSE_BAD_CHANCE) return "broccoli";
  return "candy";
}

export const isBadItem = (kind: ItemKind): boolean => kind === "broccoli";
