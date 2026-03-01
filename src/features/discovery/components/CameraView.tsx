import React, { useRef, useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';

/**
 * CameraView Component
 * Displays live camera feed with canvas overlay for MediaPipe pose detection
 * Left side of the discovery split-screen layout
 */
export const CameraView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { stream, isLoading, error } = useCamera();

  // TODO: MediaPipe initialization
  // import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
  // const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);

  // Attach camera stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

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

  // TODO: Video frame processing loop
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !stream) return;

    let animationFrameId: number;

    // const processFrame = () => {
    //   if (!videoRef.current || !poseLandmarkerRef.current) return;
    //
    //   // Detect pose in current video frame
    //   const results = poseLandmarkerRef.current.detectForVideo(
    //     videoRef.current,
    //     Date.now()
    //   );
    //
    //   // Draw landmarks on canvas
    //   drawLandmarks(canvasRef.current, results);
    //
    //   animationFrameId = requestAnimationFrame(processFrame);
    // };
    //
    // processFrame();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [stream]);

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

  if (error) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', color: '#d32f2f' }}>
          <h3>Camera Error</h3>
          <p>{error}</p>
          <p style={{ fontSize: '0.875rem', marginTop: '1rem', color: '#666' }}>
            Please ensure camera permissions are granted and try again.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p>Loading camera...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '640px',
          aspectRatio: '16/9',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '8px',
            backgroundColor: '#000',
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
};
