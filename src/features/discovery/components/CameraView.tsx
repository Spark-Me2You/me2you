import React, { useRef, useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useGestureRecognition } from '../hooks/useGestureRecognition';
import type { GestureRecognitionResult } from '../hooks/useGestureRecognition';

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

  // Attach shared camera stream to video element.
  // Depends on isInitialized because the <video> element only renders
  // after the gesture recognizer finishes loading.
  useEffect(() => {
    if (videoRef.current && stream && isInitialized) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, isInitialized]);

  // Pass detected gesture to parent component
  useEffect(() => {
    onGestureDetected?.(detectedGesture);
  }, [detectedGesture, onGestureDetected]);

  // Video frame processing loop for gesture detection
  useEffect(() => {
    if (!videoRef.current || !stream || !isInitialized) return;

    let animationFrameId: number;
    const videoElement = videoRef.current;

    const processFrame = () => {
      if (!videoRef.current) return;

      // Process gesture detection
      processVideoFrame(videoRef.current, performance.now());

      animationFrameId = requestAnimationFrame(processFrame);
    };

    // Start processing when video is ready
    if (videoElement.readyState >= 2) {
      processFrame();
    } else {
      videoElement.addEventListener('loadeddata', processFrame, { once: true });
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      // Clean up event listener
      videoElement.removeEventListener('loadeddata', processFrame);
    };
  }, [stream, isInitialized, processVideoFrame]);

  // Combine camera and gesture errors
  const combinedError = error || gestureError;

  if (combinedError) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="text-center">
          <h3 className="mb-4 font-averia text-[24px] text-error">
            {error ? 'Camera Error' : 'Gesture Recognition Error'}
          </h3>
          <p className="font-averia text-[18px] text-ink-muted">{combinedError}</p>
          <p className="font-averia text-[18px] text-ink-muted">
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
      <div className="flex h-full w-full items-center justify-center p-8">
        <p className="font-averia text-[24px] text-ink-muted">
          {isLoading
            ? 'Loading camera...'
            : 'Initializing gesture recognition...'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-white">
      <div className="relative flex h-full w-full items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full -scale-x-100 bg-black object-cover"
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute top-0 left-0 h-full w-full -scale-x-100"
        />
      </div>
    </div>
  );
};
