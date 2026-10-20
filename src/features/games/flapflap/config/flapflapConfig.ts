/**
 * FlapFlap Game Configuration
 * Physics constants and game settings
 */

export const FLAPFLAP_CONFIG = {
  // Canvas
  GAME_WIDTH: 1200,
  GAME_HEIGHT: 900,

  // Bird physics
  GRAVITY: 1200, // pixels/second^2
  FLAP_VELOCITY: -400, // pixels/second (negative = up)
  MAX_FALL_SPEED: 600, // pixels/second
  BIRD_WIDTH: 50,
  BIRD_HEIGHT: 35,
  BIRD_X: 150, // Fixed X position

  // Pipes
  PIPE_WIDTH: 80,
  PIPE_GAP: 180, // Vertical gap between pipes
  PIPE_SPEED: 200, // pixels/second
  PIPE_SPAWN_INTERVAL: 1800, // ms
  MIN_PIPE_HEIGHT: 80,
  MAX_PIPE_RISE: 160, // max upward gapY shift between consecutive pipes (pixels) — tune this

  // Scrolling background
  BACKGROUND_SPEED: 50, // pixels/second
  GROUND_HEIGHT: 100,

  // Game states
  COUNTDOWN_SECONDS: 3,

  // Colors: Pixi can't read CSS tokens, so these mirror docs/BRAND_BOOK.md
  SKY_COLOR: 0x58e7f7, // sky
  GROUND_COLOR: 0xd3e405, // lime
  PIPE_COLOR: 0x7105e4, // purple (action-games)
  BIRD_COLOR: 0xe405ac, // magenta
  BEAK_COLOR: 0xe44805, // orange
} as const;
