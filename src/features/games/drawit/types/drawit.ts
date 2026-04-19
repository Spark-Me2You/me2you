export type ScreenState =
  | "MENU"
  | "PROMPT"
  | "COUNTDOWN"
  | "DRAWING"
  | "REVIEW"
  | "THANKS"
  | "GALLERY";

export type Tool = "brush" | "eraser" | "bucket";

export type BrushSize = "small" | "medium" | "large";

export interface DrawingSubmission {
  id: string;
  word: string;
  imageUrl: string;
  createdAt: string;
}
