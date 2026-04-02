import React, { useRef, useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useGestureRecognition } from '../hooks/useGestureRecognition';
import type { GestureRecognitionResult } from '../hooks/useGestureRecognition';
import styles from './CameraView.module.css';

/**
 * CameraView Component Props
 */
interface CameraViewProps {
  onGestureDetected?: (gesture: GestureRecognitionResult | null) => void;
}

/**
 * CameraView Component
 * Displays live camera feed with gesture recognition
 * Left side of the discovery split-screen layout
 */
export const CameraView: React.FC<CameraViewProps> = ({ onGestureDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { stream, isLoading, error } = useCamera();
  const {
    detectedGesture,
    isInitialized,
    processVideoFrame,
    error: gestureError,
  } = useGestureRecognition();

  // TODO: MediaPipe initialization
  // import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
  // const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);

  // Attach shared camera stream to video element.
  // Depends on isInitialized because the <video> element only renders
  // after the gesture recognizer finishes loading.
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, isInitialized]);

  // Pass detected gesture to parent component
  useEffect(() => {
    onGestureDetected?.(detectedGesture);
  }, [detectedGesture, onGestureDetected]);

  // TODO: Initialize MediaPipe pose detection
  useEffect(() => {
    // const initMediaPipe = async () => {
    //   const vision = await FilesetResolver.forVisionTasks(
    //     "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
    //   );
    //   poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
    //     baseOptions: {
    //       modelAssetPath: "/models/pose_landmarker.task",
    //       delegate: "GPU"
    //     },
    //     runningMode: "VIDEO",
    //     numPoses: 1
    //   });
    // };
    //
    // initMediaPipe();

    return () => {
      // TODO: Cleanup MediaPipe resources
      // poseLandmarkerRef.current?.close();
    };
  }, []);

  // Video frame processing loop for gesture detection
  useEffect(() => {
    if (!videoRef.current || !stream || !isInitialized) return;

    let animationFrameId: number;
    const videoElement = videoRef.current;

    const processFrame = () => {
      if (!videoRef.current) return;

      // Process gesture detection
      processVideoFrame(videoRef.current, Date.now());

      animationFrameId = requestAnimationFrame(processFrame);
    };

    // Start processing when video is ready
    if (videoElement.readyState >= 2) {
      processFrame();
    } else {
      videoElement.addEventListener('loadeddata', processFrame);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      // Clean up event listener
      videoElement.removeEventListener('loadeddata', processFrame);
    };
  }, [stream, isInitialized, processVideoFrame]);

  // TODO: Helper function to draw pose landmarks on canvas
  // const drawLandmarks = (canvas: HTMLCanvasElement | null, results: any) => {
  //   if (!canvas) return;
  //   const ctx = canvas.getContext('2d');
  //   if (!ctx || !results?.landmarks) return;
  //
  //   // Match canvas size to video size
  //   canvas.width = videoRef.current?.videoWidth || 1280;
  //   canvas.height = videoRef.current?.videoHeight || 720;
  //
  //   ctx.clearRect(0, 0, canvas.width, canvas.height);
  //
  //   // Draw pose landmarks
  //   results.landmarks.forEach((landmark: any) => {
  //     ctx.fillStyle = 'red';
  //     ctx.beginPath();
  //     ctx.arc(
  //       landmark.x * canvas.width,
  //       landmark.y * canvas.height,
  //       5,
  //       0,
  //       2 * Math.PI
  //     );
  //     ctx.fill();
  //   });
  // };

  // Combine camera and gesture errors
  const combinedError = error || gestureError;

  if (combinedError) {
    return (
      <div className={styles.messageContainer}>
        <div className={styles.messageContent}>
          <h3 className={styles.errorTitle}>
            {error ? 'Camera Error' : 'Gesture Recognition Error'}
          </h3>
          <p className={styles.errorText}>{combinedError}</p>
          <p className={styles.errorText}>
            {error
              ? 'Please ensure camera permissions are granted and try again.'
              : 'Please ensure the gesture recognizer model is downloaded.'}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !isInitialized) {
    return (
      <div className={styles.messageContainer}>
        <p className={styles.loadingText}>
          {isLoading
            ? 'Loading camera...'
            : 'Initializing gesture recognition...'}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.videoWrapper}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={styles.video}
        />
        <canvas
          ref={canvasRef}
          className={styles.canvas}
        />
      </div>
    </div>
  );
};
