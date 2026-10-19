/**
 * Wave planning
 * Waves grow in item count and speed and arrive closer together over a round.
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

const CANDY_KINDS: readonly ItemKind[] = ["gumball", "gumball", "wrapped", "swirl"];

/** Pick what to launch. The first wave is always candy so new players warm up. */
export function pickItemKind(
  waveIndex: number,
  config: GumballSliceConfig,
  random: () => number = Math.random,
): ItemKind {
  if (waveIndex > 0 && random() < config.BAD_ITEM_FREQUENCY) {
    return random() < 0.5 ? "broccoli" : "lemon";
  }
  if (random() < config.GOLDEN_CHANCE) return "golden";
  return CANDY_KINDS[Math.floor(random() * CANDY_KINDS.length)];
}

export const isBadItem = (kind: ItemKind): boolean => kind === "broccoli" || kind === "lemon";
