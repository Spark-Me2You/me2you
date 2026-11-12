/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Supabase (required)
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;

  // Gumball Slice (all optional — see gumballSliceConfig.ts for defaults)
  readonly VITE_GUMBALL_ROUND_SECONDS?: string;
  readonly VITE_GUMBALL_MIN_SLICES?: string;
  readonly VITE_GUMBALL_MAX_BROCCOLI_HITS?: string;
  readonly VITE_GUMBALL_BROCCOLI_STRIKES?: string;
  readonly VITE_GUMBALL_CANDY_SPEED?: string;
  readonly VITE_GUMBALL_BAD_ITEM_FREQUENCY?: string;
  readonly VITE_GUMBALL_SLICE_SPEED?: string;
  readonly VITE_GUMBALL_HITBOX_SCALE?: string;
  readonly VITE_GUMBALL_TRAIL_LIFETIME_MS?: string;
  readonly VITE_GUMBALL_TRAIL_WIDTH?: string;
  readonly VITE_GUMBALL_TRAIL_SMOOTHING?: string;
  readonly VITE_GUMBALL_SEATED_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
