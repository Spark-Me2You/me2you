/**
 * HandLandmarker Lazy Loader
 * Creates a HandLandmarker instance for CV cursor tracking.
 * Reuses the cached MediaPipe WASM module from mediapipe-loader.
 */

import type { HandLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { loadMediaPipeVision } from "../mediapipe-loader";

let handLandmarkerInstance: HandLandmarker | null = null;

export const createHandLandmarker = async (): Promise<HandLandmarker> => {
  if (handLandmarkerInstance) {
    return handLandmarkerInstance;
  }

  const vision = await loadMediaPipeVision();

  const fileset = await vision.FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm",
  );

  handLandmarkerInstance = await vision.HandLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  return handLandmarkerInstance;
};

export const closeHandLandmarker = () => {
  if (handLandmarkerInstance) {
    handLandmarkerInstance.close();
    handLandmarkerInstance = null;
  }
};

export type { HandLandmarker, NormalizedLandmark };
