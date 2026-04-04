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

export interface UsePoseDetectionReturn {
  landmarksRef: React.RefObject<NormalizedLandmark[] | null>;
  isInitialized: boolean;
  error: string | null;
  processFrame: (video: HTMLVideoElement, timestamp: number) => void;
}

const PROCESS_INTERVAL = 33; // ms (30 FPS)

export const usePoseDetection = (): UsePoseDetectionReturn => {
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const lastProcessTimeRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const poseLandmarker = await createPoseLandmarker(
          poseLandmarkerConfig,
        );
        if (mounted) {
          poseLandmarkerRef.current = poseLandmarker;
          setIsInitialized(true);
        } else {
          poseLandmarker.close();
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to init pose detection",
          );
        }
      }
    };

    init();

    return () => {
      mounted = false;
      poseLandmarkerRef.current?.close();
    };
  }, []);

  const processFrame = useCallback(
    (video: HTMLVideoElement, timestamp: number) => {
      if (!poseLandmarkerRef.current || !isInitialized) return;

      // Throttle pose detection to 30 FPS
      if (timestamp - lastProcessTimeRef.current < PROCESS_INTERVAL) {
        return;
      }
      lastProcessTimeRef.current = timestamp;

      // Ensure video has valid dimensions before processing
      if (
        !video.videoWidth ||
        !video.videoHeight ||
        video.readyState < 2
      ) {
        return;
      }

      try {
        const result: PoseLandmarkerResult =
          poseLandmarkerRef.current.detectForVideo(video, timestamp);

        if (result.landmarks && result.landmarks.length > 0) {
          landmarksRef.current = result.landmarks[0]; // First person's landmarks
        } else {
          landmarksRef.current = null;
        }
      } catch (err) {
        console.error("Pose detection error:", err);
      }
    },
    [isInitialized],
  );

  return { landmarksRef, isInitialized, error, processFrame };
};
