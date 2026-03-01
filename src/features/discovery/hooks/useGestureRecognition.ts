import { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import type { GestureRecognizerResult } from '@mediapipe/tasks-vision';
import { gestureRecognizerConfig } from '@/core/cv/mediapipe-config';

/**
 * Gesture Recognition Result Interface
 * Represents a detected gesture with confidence and handedness
 */
export interface GestureRecognitionResult {
  gestureName: string | null;
  confidence: number;
  handedness: 'Left' | 'Right' | null;
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

  // Initialize MediaPipe GestureRecognizer
  useEffect(() => {
    let mounted = true;

    const initializeGestureRecognizer = async () => {
      try {
        setError(null);
        setIsInitialized(false);

        // Load MediaPipe vision WASM files from CDN
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (!mounted) return;

        // Create GestureRecognizer instance with configuration
        const gestureRecognizer = await GestureRecognizer.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath: gestureRecognizerConfig.modelAssetPath,
              delegate: 'GPU', // Use GPU acceleration if available
            },
            runningMode: gestureRecognizerConfig.runningMode,
            numHands: gestureRecognizerConfig.numHands,
            minHandDetectionConfidence:
              gestureRecognizerConfig.minHandDetectionConfidence,
            minHandPresenceConfidence:
              gestureRecognizerConfig.minHandPresenceConfidence,
            minTrackingConfidence: gestureRecognizerConfig.minTrackingConfidence,
          }
        );

        if (!mounted) {
          gestureRecognizer.close();
          return;
        }

        gestureRecognizerRef.current = gestureRecognizer;
        setIsInitialized(true);
      } catch (err) {
        if (mounted) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : 'Failed to initialize gesture recognition';
          setError(errorMessage);
          console.error('GestureRecognizer initialization error:', err);
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

          setDetectedGesture({
            gestureName: gesture.categoryName,
            confidence: gesture.score,
            handedness: handedness
              ? (handedness.categoryName as 'Left' | 'Right')
              : null,
          });
        } else {
          // No gesture detected
          setDetectedGesture(null);
        }
      } catch (err) {
        // Log processing errors but don't crash
        console.error('Error processing video frame:', err);
      }
    },
    [isInitialized]
  );

  return {
    detectedGesture,
    isInitialized,
    error,
    processVideoFrame,
  };
};
