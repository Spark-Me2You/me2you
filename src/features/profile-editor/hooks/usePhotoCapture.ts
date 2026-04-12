import { useState, useRef, useCallback, useEffect } from 'react';
import { useGestureRecognition } from '@/features/discovery/hooks/useGestureRecognition';
import { getCategoryFromGesture } from '@/features/discovery/config/gestureMapping';
import type { GestureCategory } from '../types/profileTypes';

interface UsePhotoCaptureResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  photo: Blob | null;
  previewUrl: string | null;
  detectedCategory: GestureCategory | null;
  detectedGestureName: string | null;
  isCameraReady: boolean;
  isGestureReady: boolean;
  cameraError: string | null;
  capturePhoto: () => void;
  retakePhoto: () => void;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export const usePhotoCapture = (): UsePhotoCaptureResult => {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detectedCategory, setDetectedCategory] = useState<GestureCategory | null>(null);
  const [detectedGestureName, setDetectedGestureName] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const {
    detectedGesture,
    isInitialized: isGestureReady,
    processVideoFrame,
  } = useGestureRecognition();

  // Update detected category when gesture changes
  useEffect(() => {
    if (detectedGesture?.gestureName) {
      const category = getCategoryFromGesture(detectedGesture.gestureName);
      if (category) {
        setDetectedCategory(category as GestureCategory);
        setDetectedGestureName(detectedGesture.gestureName);
      }
    }
  }, [detectedGesture]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsCameraReady(false);

    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      // Check if component is still mounted
      if (!videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      // Explicitly play the video
      try {
        await videoRef.current.play();
      } catch (playError) {
        console.warn('[usePhotoCapture] Video play() failed:', playError);
      }

      // Wait for video to be ready with timeout
      await new Promise<void>((resolve, reject) => {
        const video = videoRef.current;
        if (!video) {
          reject(new Error('Video element not found'));
          return;
        }

        const onLoadedData = () => {
          video.removeEventListener('loadeddata', onLoadedData);
          video.removeEventListener('error', onError);
          setIsCameraReady(true);
          resolve();
        };

        const onError = () => {
          video.removeEventListener('loadeddata', onLoadedData);
          video.removeEventListener('error', onError);
          reject(new Error('Video failed to load'));
        };

        video.addEventListener('loadeddata', onLoadedData);
        video.addEventListener('error', onError);

        // Timeout fallback (5 seconds)
        setTimeout(() => {
          video.removeEventListener('loadeddata', onLoadedData);
          video.removeEventListener('error', onError);

          // Check if video is actually playing
          if (video.readyState >= 2) {
            setIsCameraReady(true);
            resolve();
          } else {
            reject(new Error('Camera initialization timeout'));
          }
        }, 5000);
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setCameraError('camera access denied — please allow camera access in your browser settings');
        } else if (err.name === 'NotFoundError') {
          setCameraError('no camera found — please connect a camera and try again');
        } else if (err.message.includes('timeout')) {
          setCameraError('camera initialization timeout — please try again');
        } else {
          setCameraError(`camera error: ${err.message}`);
        }
      } else {
        setCameraError('failed to access camera');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraReady(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas context unavailable');

      // Mirror the image (like a selfie)
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Process for gesture detection
      if (isGestureReady) processVideoFrame(video, Date.now());

      canvas.toBlob(
        (blob) => {
          if (blob) {
            setPhoto(blob);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(blob));
          }
        },
        'image/jpeg',
        0.9,
      );
    } catch (e) {
      console.error('[usePhotoCapture] Failed to capture photo:', e);
    }
  }, [previewUrl, isGestureReady, processVideoFrame]);

  const retakePhoto = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhoto(null);
    setPreviewUrl(null);
    setDetectedCategory(null);
    setDetectedGestureName(null);
  }, [previewUrl]);

  return {
    videoRef,
    canvasRef,
    photo,
    previewUrl,
    detectedCategory,
    detectedGestureName,
    isCameraReady,
    isGestureReady,
    cameraError,
    capturePhoto,
    retakePhoto,
    startCamera,
    stopCamera,
  };
};
