/**
 * Gesture Mapping Configuration
 * Maps MediaPipe gesture names to database image categories
 */

export interface GestureMapping {
  /** MediaPipe gesture name (e.g., "Victory", "Open_Palm") */
  gestureName: string;
  /** Database image category (e.g., "peace_sign", "wave") */
  category: string;
  /** User-friendly display name for UI */
  displayName: string;
  /** Instruction text for users */
  instructionText: string;
}

/**
 * Supported gesture mappings
 * Add new gestures here to extend functionality
 */
export const GESTURE_MAPPINGS: readonly GestureMapping[] = [
  {
    gestureName: "Victory",
    category: "peace_sign",
    displayName: "Peace Sign",
    instructionText: "Show a peace sign to reveal a random photo",
  },
  {
    gestureName: "Open_Palm",
    category: "wave",
    displayName: "Wave",
    instructionText: "Wave your hand to reveal a random photo",
  },
  {
    gestureName: "Thumb_Up",
    category: "thumbs_up",
    displayName: "Thumbs Up",
    instructionText: "Show a thumbs up to reveal a random photo",
  },
] as const;

/**
 * Get category from gesture name
 * @param gestureName MediaPipe gesture name
 * @returns Database category or null if gesture not supported
 */
export const getCategoryFromGesture = (
  gestureName: string | null
): string | null => {
  if (!gestureName) return null;
  const mapping = GESTURE_MAPPINGS.find((m) => m.gestureName === gestureName);
  return mapping?.category ?? null;
};

/**
 * Get gesture mapping by gesture name
 * @param gestureName MediaPipe gesture name
 * @returns Complete mapping object or null if not found
 */
export const getGestureMapping = (
  gestureName: string | null
): GestureMapping | null => {
  if (!gestureName) return null;
  return GESTURE_MAPPINGS.find((m) => m.gestureName === gestureName) ?? null;
};

/**
 * Check if a gesture is supported
 * @param gestureName MediaPipe gesture name
 * @returns true if gesture is mapped to a category
 */
export const isSupportedGesture = (gestureName: string | null): boolean => {
  if (!gestureName) return false;
  return GESTURE_MAPPINGS.some((m) => m.gestureName === gestureName);
};

/**
 * Pre-computed list of all categories for chamber initialization
 * This avoids recreating the array on every render
 */
export const CATEGORY_LIST: readonly string[] = GESTURE_MAPPINGS.map(
  (m) => m.category
);
