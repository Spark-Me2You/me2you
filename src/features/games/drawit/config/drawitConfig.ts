import type { BrushSize } from "../types/drawit";

export const PALETTE: readonly string[] = [
  "#000000",
  "#808080",
  "#FF0000",
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#0000FF",
  "#FF00FF",
  "#FFFFFF",
  "#804000",
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

export const COUNTDOWN_STEPS = ["3", "2", "1", "GO!"] as const;
export const COUNTDOWN_STEP_MS = 800;

export const GALLERY_BUCKET = "drawit-gallery";
export const GALLERY_TABLE = "drawit_submissions";
