import type { BrushSize } from "../types/drawit";

// Brush colors: the brand palette plus white and brown for drawing. Canvas pixels can't use
// CSS tokens, so these mirror docs/BRAND_BOOK.md (token in the comment).
export const PALETTE: readonly string[] = [
  "#000000", // ink
  "#666666", // ink-muted
  "#FF0000", // red
  "#E44805", // orange
  "#D3E405", // lime
  "#22C55E", // green
  "#58E7F7", // sky
  "#1405E4", // blue
  "#7105E4", // purple
  "#E405AC", // magenta
  "#FFFFFF",
  "#804000", // brown, no brand equivalent
] as const;

export const BRUSH_PX: Record<BrushSize, number> = {
  small: 5,
  medium: 15,
  large: 30,
};

export const CANVAS_BG = "#FFFFFF";

export const DRAW_DURATION_SEC = 180;
export const TIMER_PULSE_THRESHOLD_SEC = 30;
export const TIMER_FLASH_THRESHOLD_SEC = 10;

export const COUNTDOWN_STEPS = ["3", "2", "1", "go!"] as const;
export const COUNTDOWN_STEP_MS = 800;

export const GALLERY_BUCKET = "drawit-gallery";
export const GALLERY_TABLE = "drawit_submissions";
