import { useState, useEffect, useRef, useCallback } from "react";
import { createGestureRecognizer } from "@/core/cv/mediapipe-loader";
import type {
  GestureRecognizer,
  GestureRecognizerResult,
} from "@/core/cv/mediapipe-loader";
import { gestureRecognizerConfig } from "@/core/cv/mediapipe-config";

/**
 * Gesture Recognition Result Interface
 * Represents a detected gesture with confidence and handedness
 */
export interface GestureRecognitionResult {
  gestureName: string | null;
  confidence: number;
  handedness: "Left" | "Right" | null;
}

/**
 * useGestureRecognition Hook
 * Encapsulates MediaPipe GestureRecognizer logic for detecting hand gestures
 *
 * @returns {object} Gesture recognition state and processing function
 * - detectedGesture: Current detected gesture (null if none)
 * - isInitialized: Whether MediaPipe is ready
 * - error: Error message if initialization failed
 * - processVideoFrame: Function to process a video frame for gesture detection
 */
export const useGestureRecognition = () => {
  const [detectedGesture, setDetectedGesture] =
    useState<GestureRecognitionResult | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const previousGestureRef = useRef<GestureRecognitionResult | null>(null);

  // Initialize MediaPipe GestureRecognizer
  useEffect(() => {
    let mounted = true;

    const initializeGestureRecognizer = async () => {
      try {
        setError(null);
        setIsInitialized(false);

        // Lazy load MediaPipe and create GestureRecognizer
        const gestureRecognizer = await createGestureRecognizer(
          gestureRecognizerConfig,
        );

        if (!mounted) {
          gestureRecognizer.close();
          return;
        }

        gestureRecognizerRef.current = gestureRecognizer;
        setIsInitialized(true);
        console.log(
          "Gesture recognizer model loaded successfully (lazy loaded)",
        );
      } catch (err) {
        if (mounted) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to initialize gesture recognition";
          setError(errorMessage);
          console.error("GestureRecognizer initialization error:", err);
        }
      }
    };

    initializeGestureRecognizer();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (gestureRecognizerRef.current) {
        gestureRecognizerRef.current.close();
        gestureRecognizerRef.current = null;
      }
    };
  }, []);

  /**
   * Process a video frame to detect gestures
   * Called from the animation loop in CameraView
   */
  const processVideoFrame = useCallback(
    (video: HTMLVideoElement, timestamp: number) => {
      if (!gestureRecognizerRef.current || !isInitialized) {
        return;
      }

      try {
        // Detect gestures in the current video frame
        const results: GestureRecognizerResult =
          gestureRecognizerRef.current.recognizeForVideo(video, timestamp);

        // Extract gesture information from results
        if (results.gestures && results.gestures.length > 0) {
          // Get the first detected gesture
          const gesture = results.gestures[0][0]; // First hand, first gesture
          const handedness = results.handedness[0]?.[0];

          const newGesture: GestureRecognitionResult = {
            gestureName: gesture.categoryName,
            confidence: gesture.score,
            handedness: handedness
              ? (handedness.categoryName as "Left" | "Right")
              : null,
          };

          // Only update state if gesture changed (prevents re-renders on every frame)
          const previousGesture = previousGestureRef.current;
          if (
            !previousGesture ||
            previousGesture.gestureName !== newGesture.gestureName ||
            previousGesture.handedness !== newGesture.handedness
          ) {
            previousGestureRef.current = newGesture;
            setDetectedGesture(newGesture);
          }
        } else {
          // No gesture detected - only update if we previously had a gesture
          if (previousGestureRef.current !== null) {
            previousGestureRef.current = null;
            setDetectedGesture(null);
          }
        }
      } catch (err) {
        // Log processing errors but don't crash
        console.error("Error processing video frame:", err);
      }
    },
    [isInitialized],
  );

  return {
    detectedGesture,
    isInitialized,
    error,
    processVideoFrame,
  };
};
