/**
 * Gumball Slice Configuration
 * Every tunable for the game lives here. The values most likely to change on
 * the kiosk can be overridden from `.env` (VITE_GUMBALL_*) without code changes.
 *
 * Distances are fractions of the screen HEIGHT so the game plays the same at
 * any kiosk resolution; times are ms unless the name says otherwise.
 */

import type { CSSProperties } from "react";
import { colors } from "@/shared/theme/colors";
import { typography } from "@/shared/theme/typography";

const env = import.meta.env;

const envNumber = (key: string, fallback: number): number => {
  const raw = env[key];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
};

const envFlag = (key: string, fallback: boolean): boolean => {
  const raw = env[key];
  if (raw === undefined || raw === "") return fallback;
  return raw === "true" || raw === "1";
};

export const GUMBALL_SLICE_CONFIG = {
  // Round
  ROUND_SECONDS: envNumber("VITE_GUMBALL_ROUND_SECONDS", 60),
  // Winning real candy: play the full round, slice at least MIN_SLICES
  // candies, and slice no more than MAX_BROCCOLI_HITS broccoli.
  // Slicing BROCCOLI_STRIKES broccoli ends the round early ("you're out").
  MIN_SLICES: envNumber("VITE_GUMBALL_MIN_SLICES", 20),
  MAX_BROCCOLI_HITS: envNumber("VITE_GUMBALL_MAX_BROCCOLI_HITS", 2),
  BROCCOLI_STRIKES: envNumber("VITE_GUMBALL_BROCCOLI_STRIKES", 3),
  STRIKEOUT_DELAY_SEC: 0.9, // let the last X and broccoli burst land before results
  COUNTDOWN_STEPS: ["3", "2", "1", "GO!"],
  COUNTDOWN_STEP_MS: 800,

  // Seated / one-hand mode: slower candies, larger hitboxes
  SEATED_MODE: envFlag("VITE_GUMBALL_SEATED_MODE", false),
  SEATED_SPEED_FACTOR: 0.7,
  SEATED_HITBOX_FACTOR: 1.35,

  // Candy flight
  CANDY_SPEED_MULTIPLIER: envNumber("VITE_GUMBALL_CANDY_SPEED", 1),
  CANDY_RADIUS: 0.08,
  GRAVITY: 1.5, // screen heights / s²
  // Reach zone: every arc peaks inside this box (fractions of the screen,
  // y measured from the top). Keeps items out of the hard-to-reach corners,
  // from under the HUD, and off the very bottom.
  REACH_X_MIN: 0.25,
  REACH_X_MAX: 0.75,
  REACH_Y_MIN: 0.3, // highest an item's centre peaks
  REACH_Y_MAX: 0.55, // lowest an item's centre peaks
  LAUNCH_X_SPREAD: 0.15, // items enter up to this far left/right of their peak

  // Waves (grow in count and speed)
  FIRST_WAVE_SIZE: 1,
  WAVE_SIZE_GROWTH: 0.3, // extra items per wave
  MAX_WAVE_SIZE: 4,
  MAX_ITEMS_ON_SCREEN: 5, // launches wait while this many items are in the air
  WAVE_SPEED_GROWTH: 0.035, // extra speed per wave
  MAX_WAVE_SPEED: 1.45,
  FIRST_WAVE_DELAY_SEC: 0.6,
  WAVE_INTERVAL_SEC: 3.0,
  MIN_WAVE_INTERVAL_SEC: 2.2,
  WAVE_INTERVAL_DECAY_SEC: 0.08,
  LAUNCH_STAGGER_SEC: 0.3,
  NO_LAUNCH_FINAL_SEC: 1.2, // no new launches this close to the buzzer

  // Suspense beats: a quiet pause, then one mystery item that floats up in
  // slow motion
  SUSPENSE_EVERY_WAVES: 4, // every Nth wave is a suspense beat (never the first)
  SUSPENSE_LULL_SEC: 2.6, // quiet time before the mystery item
  SUSPENSE_AFTER_SEC: 1.6, // gap before the next normal wave
  SUSPENSE_SLOWMO: 0.55, // flight time-scale of the mystery item
  SUSPENSE_RAINBOW_CHANCE: 0.15,
  SUSPENSE_BAD_CHANCE: 0.3,

  // Item mix
  BAD_ITEM_FREQUENCY: envNumber("VITE_GUMBALL_BAD_ITEM_FREQUENCY", 0.15), // broccoli chance per item, from wave 2
  RAINBOW_CHANCE: 0.015, // the rainbow swirl candy: a rare secret bonus worth RAINBOW_POINTS

  // Scoring
  CANDY_POINTS: 10,
  RAINBOW_POINTS: 50,
  BAD_POINTS: -25,
  COMBO_MIN: 3, // good candies in one swipe for a combo bonus
  COMBO_POINTS_PER_CANDY: 10,
  BIG_COMBO_SHAKE: 5, // combos this large shake the screen

  // Slicing
  SLICE_SPEED_THRESHOLD: envNumber("VITE_GUMBALL_SLICE_SPEED", 1.3), // screen heights / s
  HITBOX_SCALE: envNumber("VITE_GUMBALL_HITBOX_SCALE", 1.35), // hit radius ÷ sprite radius
  SWIPE_END_MS: 150, // below threshold this long ends a swipe (combo grouping)

  // Slash trail
  TRAIL_LIFETIME_MS: envNumber("VITE_GUMBALL_TRAIL_LIFETIME_MS", 350),
  TRAIL_WIDTH: envNumber("VITE_GUMBALL_TRAIL_WIDTH", 0.03), // head width
  TRAIL_SMOOTHING: envNumber("VITE_GUMBALL_TRAIL_SMOOTHING", 0.35), // 0 = raw … 1 = heavy
  TRAIL_CAPACITY: 64, // ring buffer size (samples)
  TRAIL_SUBDIVISIONS: 4, // Catmull-Rom points per segment
  STROKE_GAP_MS: 160, // samples further apart than this start a new stroke
  CURSOR_DOT_RADIUS: 0.011,

  // Tracking / player lock
  SAMPLE_STALE_MS: 200, // a sample older than this means the hand is gone
  LOCK_MIN_SCALE_RATIO: 0.55, // reject hands much smaller than the locked player's
  LOCK_MAX_JUMP: 0.3, // reject wrist jumps larger than this (normalized camera units)…
  LOCK_JUMP_WINDOW_MS: 500, // …within this window since the last accepted sample
  LOCK_SCALE_ADAPT: 0.05, // how fast the locked hand size follows the player
  PLAYER_LOST_WARNING_MS: 1000,
  PLAYER_LOST_TIMEOUT_MS: 3000,

  // Effects
  PARTICLE_POOL_SIZE: 260,
  PARTICLES_PER_SLICE: 16,
  POPUP_POOL_SIZE: 24,
  HALF_POOL_SIZE: 40,
  ITEM_POOL_SIZE: 24,
  SHAKE_MS: 380,
  SHAKE_AMPLITUDE: 0.018,

  // Colors (theme tokens only)
  TRAIL_GLOW_COLOR: colors.gradient.start,
  TRAIL_CORE_COLOR: colors.white,
  CANDY_IMAGE_SCALE: 1, // candy image diameter ÷ (2 × CANDY_RADIUS)
  BROCCOLI_COLOR: colors.leafGreen, // broccoli crumbs
  BROCCOLI_SIZE: 2.6, // sprite's longest side ÷ candy radius
  BROCCOLI_ROTATION_DEG: 58, // stands the side-lying PNG upright (stem down)
  BROCCOLI_WOBBLE: 0.8, // max spin (rad/s) so it stays upright-ish in flight
  OUTLINE_BAD: colors.black,
  POPUP_GOOD_COLOR: colors.white,
  POPUP_BONUS_COLOR: colors.gold, // "+50" for the rainbow candy
  POPUP_BAD_COLOR: colors.btnOrange,
  POPUP_COMBO_COLOR: colors.btnYellowGreen,
} as const;

export type GumballSliceConfig = typeof GUMBALL_SLICE_CONFIG;

/**
 * Theme tokens exposed to the game's CSS modules as custom properties, so the
 * stylesheets reference the shared palette instead of hard-coding colours.
 */
export const GUMBALL_SLICE_CSS_VARS = {
  "--gs-font": typography.font.jersey,
  "--gs-accent": colors.gradient.start,
  "--gs-magenta": colors.magenta,
  "--gs-gold": colors.gold,
  "--gs-lime": colors.btnYellowGreen,
  "--gs-orange": colors.btnOrange,
  "--gs-red": colors.red,
  "--gs-white": colors.white,
  "--gs-wood-light": colors.woodLight,
  "--gs-wood-mid": colors.woodMid,
  "--gs-wood-dark": colors.woodDark,
  "--gs-wood-seam": colors.woodSeam,
} as CSSProperties;
