/**
 * Pose Detection Hook
 * Provides pose landmarks from video stream using MediaPipe PoseLandmarker
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createPoseLandmarker } from "@/core/cv/mediapipe-loader";
import { poseLandmarkerConfig } from "@/core/cv/mediapipe-config";
import type {
  PoseLandmarker,
  PoseLandmarkerResult,
} from "@/core/cv/mediapipe-loader";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

interface UsePoseDetectionOptions {
  numPoses?: number;
}

export interface UsePoseDetectionReturn {
  landmarksRef: React.RefObject<NormalizedLandmark[] | null>;
  /** Landmarks for every detected person (length <= numPoses) */
  allLandmarksRef: React.RefObject<NormalizedLandmark[][]>;
  frameSequenceRef: React.RefObject<number>;
  isInitialized: boolean;
  error: string | null;
  processFrame: (video: HTMLVideoElement, timestamp: number) => void;
}

export const POSE_PROCESS_INTERVAL_MS = 75; // ms (~13 FPS, better input response)

export const usePoseDetection = (
  options: UsePoseDetectionOptions = {},
): UsePoseDetectionReturn => {
  const { numPoses = poseLandmarkerConfig.numPoses } = options;
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const allLandmarksRef = useRef<NormalizedLandmark[][]>([]);
  const frameSequenceRef = useRef(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const lastProcessTimeRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const poseLandmarker = await createPoseLandmarker({
          ...poseLandmarkerConfig,
          numPoses,
        });
        if (mounted) {
          poseLandmarkerRef.current = poseLandmarker;
          setIsInitialized(true);
        } else {
          poseLandmarker.close();
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to init pose detection",
          );
        }
      }
    };

    init();

    return () => {
      mounted = false;
      poseLandmarkerRef.current?.close();
    };
  }, [numPoses]);

  const processFrame = useCallback(
    (video: HTMLVideoElement, timestamp: number) => {
      if (!poseLandmarkerRef.current || !isInitialized) return;

      // Throttle pose detection to ~15 FPS
      if (timestamp - lastProcessTimeRef.current < POSE_PROCESS_INTERVAL_MS) {
        return;
      }
      lastProcessTimeRef.current = timestamp;

      // Ensure video has valid dimensions before processing
      if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
        return;
      }

      try {
        const result: PoseLandmarkerResult =
          poseLandmarkerRef.current.detectForVideo(video, timestamp);

        if (result.landmarks && result.landmarks.length > 0) {
          landmarksRef.current = result.landmarks[0]; // First person's landmarks
          allLandmarksRef.current = result.landmarks;
          frameSequenceRef.current += 1;
        } else {
          landmarksRef.current = null;
          allLandmarksRef.current = [];
        }
      } catch (err) {
        console.error("Pose detection error:", err);
      }
    },
    [isInitialized],
  );

  return {
    landmarksRef,
    allLandmarksRef,
    frameSequenceRef,
    isInitialized,
    error,
    processFrame,
  };
};
