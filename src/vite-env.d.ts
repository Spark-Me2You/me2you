/// <reference types="vite/client" />

/**
 * Environment variable types
 * TODO: Define types for all VITE_* environment variables
 */
interface ImportMetaEnv {
  // Application Settings
  readonly VITE_SESSION_TIMEOUT_MS: string;
  readonly VITE_GESTURE_COOLDOWN_MS: string;
  readonly VITE_IDLE_TIMEOUT_MS: string;
  readonly VITE_TARGET_FPS: string;

  // Gumball Slice (all optional — see gumballSliceConfig.ts for defaults)
  readonly VITE_GUMBALL_ROUND_SECONDS?: string;
  readonly VITE_GUMBALL_MIN_SLICES?: string;
  readonly VITE_GUMBALL_CANDY_SPEED?: string;
  readonly VITE_GUMBALL_BAD_ITEM_FREQUENCY?: string;
  readonly VITE_GUMBALL_SLICE_SPEED?: string;
  readonly VITE_GUMBALL_HITBOX_SCALE?: string;
  readonly VITE_GUMBALL_TRAIL_LIFETIME_MS?: string;
  readonly VITE_GUMBALL_TRAIL_WIDTH?: string;
  readonly VITE_GUMBALL_TRAIL_SMOOTHING?: string;
  readonly VITE_GUMBALL_SEATED_MODE?: string;

  // Development
  readonly VITE_ENABLE_LOGGER: string;
  readonly VITE_ENABLE_PERFORMANCE_MONITOR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
