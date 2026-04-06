/**
 * Input Types
 * Common input-related type definitions for games
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export interface PoseFrame {
  landmarks: NormalizedLandmark[];
  timestamp: number;
}
