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
  MIN_SLICES: envNumber("VITE_GUMBALL_MIN_SLICES", 25), // candy goal + reward qualification
  COUNTDOWN_STEPS: ["3", "2", "1", "GO!"],
  COUNTDOWN_STEP_MS: 800,

  // Seated / one-hand mode: slower candies, larger hitboxes
  SEATED_MODE: envFlag("VITE_GUMBALL_SEATED_MODE", false),
  SEATED_SPEED_FACTOR: 0.7,
  SEATED_HITBOX_FACTOR: 1.35,

  // Candy flight
  CANDY_SPEED_MULTIPLIER: envNumber("VITE_GUMBALL_CANDY_SPEED", 1),
  CANDY_RADIUS: 0.055,
  GRAVITY: 1.5, // screen heights / s²
  APEX_MIN: 0.45, // apex height above the bottom edge
  APEX_MAX: 0.85,
  LAUNCH_X_MARGIN: 0.15, // fraction of screen width kept clear at each side

  // Waves (grow in count and speed)
  FIRST_WAVE_SIZE: 2,
  WAVE_SIZE_GROWTH: 0.4, // extra items per wave
  MAX_WAVE_SIZE: 7,
  WAVE_SPEED_GROWTH: 0.035, // extra speed per wave
  MAX_WAVE_SPEED: 1.45,
  FIRST_WAVE_DELAY_SEC: 0.6,
  WAVE_INTERVAL_SEC: 2.6,
  MIN_WAVE_INTERVAL_SEC: 1.5,
  WAVE_INTERVAL_DECAY_SEC: 0.08,
  LAUNCH_STAGGER_SEC: 0.18,
  NO_LAUNCH_FINAL_SEC: 1.2, // no new launches this close to the buzzer

  // Item mix
  BAD_ITEM_FREQUENCY: envNumber("VITE_GUMBALL_BAD_ITEM_FREQUENCY", 0.15), // per launched item, from wave 2
  GOLDEN_CHANCE: 0.04,

  // Scoring
  CANDY_POINTS: 10,
  GOLDEN_POINTS: 50,
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
  START_HOLD_MS: 2000,
  START_DROPOUT_GRACE_MS: 300,
  START_MIN_HAND_SCALE: 0.045, // nearest player only; bystanders' hands read smaller
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
  CANDY_COLORS: [colors.magenta, colors.gradient.start, colors.btnOrange],
  WRAPPED_COLOR: colors.btnPink,
  SWIRL_COLOR: colors.btnPurple,
  GOLDEN_COLOR: colors.gold,
  BROCCOLI_COLOR: colors.leafGreen,
  BROCCOLI_SHADE_COLOR: colors.leafGreenDark,
  LEMON_COLOR: colors.btnYellowGreen,
  OUTLINE_GOOD: colors.white,
  OUTLINE_BAD: colors.black,
  POPUP_GOOD_COLOR: colors.white,
  POPUP_GOLDEN_COLOR: colors.gold,
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
  "--gs-bg-top": colors.gameNight,
  "--gs-bg-bottom": colors.gameNightDeep,
  "--gs-accent": colors.gradient.start,
  "--gs-magenta": colors.magenta,
  "--gs-gold": colors.gold,
  "--gs-lime": colors.btnYellowGreen,
  "--gs-orange": colors.btnOrange,
  "--gs-purple": colors.btnPurple,
  "--gs-white": colors.white,
  "--gs-black": colors.black,
  "--gs-glass": colors.glass,
} as CSSProperties;
