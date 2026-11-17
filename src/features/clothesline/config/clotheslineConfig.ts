/**
 * Clothesline configuration. See docs/CLOTHESLINE.md.
 */

export type ClotheslineBackend = "local" | "supabase";

/**
 * Where garments are stored. `local` keeps them in this browser's IndexedDB
 * (one kiosk, no claiming); `supabase` needs migration 027 and the
 * `claim-garment` edge function deployed. Stays `local` until that happens.
 */
export const CLOTHESLINE_BACKEND: ClotheslineBackend =
  import.meta.env.VITE_CLOTHESLINE_BACKEND === "supabase" ? "supabase" : "local";

export const CLOTHESLINE_CONFIG = {
  /** Garments shown on the clothesline screen. */
  lineLimit: 16,
  /** Garments per rope on the clothesline screen. */
  perRope: 8,
  /** Garments on the mini line beside the home-screen button. */
  previewLimit: 4,
  /** Garments on the decorative line in the hub's main room. */
  hubLimit: 7,
  /** Photo booth countdown, in seconds. */
  countdownSeconds: 3,
  /** Longest side of the frame the models run on. */
  workSize: 720,
  /** Longest side of a saved cutout PNG. */
  cutoutSize: 512,
} as const;

/**
 * How a top sits on the mii body sprite (325×250 frame, feet at the bottom).
 * Factors are shares of the body sprite's displayed width / height.
 */
export const MII_TOP_FIT = {
  /** Widest a top may be: torso plus a bit of sleeve. */
  maxWidthFactor: 0.72,
  /** Tallest a top may be: shoulders to the top of the legs. */
  maxHeightFactor: 0.64,
  /** Distance of the shoulder line below the top of the body frame. */
  shoulderYFactor: 0.07,
} as const;
