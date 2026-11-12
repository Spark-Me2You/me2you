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

  const modelAssetPath =
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";
  const create = (delegate: "GPU" | "CPU") =>
    vision.HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath, delegate },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      // Lower than detection, so a hand already being tracked isn't lost as its fingers close.
      minHandPresenceConfidence: 0.3,
      minTrackingConfidence: 0.3,
    });

  try {
    handLandmarkerInstance = await create("GPU");
  } catch (gpuError) {
    // Some kiosk machines have no usable WebGL/GPU delegate: fall back to the CPU once.
    console.warn("[handLandmarker] GPU delegate failed, retrying on CPU:", gpuError);
    handLandmarkerInstance = await create("CPU");
  }

  return handLandmarkerInstance;
};

export const closeHandLandmarker = () => {
  if (handLandmarkerInstance) {
    handLandmarkerInstance.close();
    handLandmarkerInstance = null;
  }
};

export type { HandLandmarker, NormalizedLandmark };
