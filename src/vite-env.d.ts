/// <reference types="vite/client" />

/**
 * Environment variable types
 * TODO: Define types for all VITE_* environment variables
 */
interface ImportMetaEnv {
  // Supabase
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;

  // Application Settings
  readonly VITE_SESSION_TIMEOUT_MS: string;
  readonly VITE_GESTURE_COOLDOWN_MS: string;
  readonly VITE_IDLE_TIMEOUT_MS: string;
  readonly VITE_TARGET_FPS: string;

  // Development
  readonly VITE_ENABLE_LOGGER: string;
  readonly VITE_ENABLE_PERFORMANCE_MONITOR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
