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

  // Scrolling background
  BACKGROUND_SPEED: 50, // pixels/second
  GROUND_HEIGHT: 100,

  // Game states
  COUNTDOWN_SECONDS: 3,

  // Colors
  SKY_COLOR: 0x87ceeb,
  GROUND_COLOR: 0x8b4513,
  PIPE_COLOR: 0x228b22,
  BIRD_COLOR: 0xffd700,
} as const;
