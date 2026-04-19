import { useState, useRef, useCallback, useEffect } from "react";
import { useGestureRecognition } from "@/features/discovery/hooks/useGestureRecognition";
import { getCategoryFromGesture } from "@/features/discovery/config/gestureMapping";
import type { GestureCategory } from "../types/profileTypes";

const VIDEO_REF_WAIT_TIMEOUT_MS = 3000;
const CAMERA_READY_TIMEOUT_MS = 8000;

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
  const [detectedCategory, setDetectedCategory] =
    useState<GestureCategory | null>(null);
  const [detectedGestureName, setDetectedGestureName] = useState<string | null>(
    null,
  );
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startRequestIdRef = useRef(0);

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
    const requestId = ++startRequestIdRef.current;

    setCameraError(null);
    setIsCameraReady(false);

    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (requestId !== startRequestIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const waitForVideoElement = async (): Promise<HTMLVideoElement> => {
        const startedAt = Date.now();
        while (Date.now() - startedAt < VIDEO_REF_WAIT_TIMEOUT_MS) {
          if (requestId !== startRequestIdRef.current) {
            throw new Error("Camera initialization cancelled");
          }

          if (videoRef.current) {
            return videoRef.current;
          }

          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 50);
          });
        }

        throw new Error("Camera view not ready");
      };

      const video = await waitForVideoElement();

      if (requestId !== startRequestIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      video.srcObject = stream;

      // Explicitly play the video
      try {
        await video.play();
      } catch (playError) {
        console.warn("[usePhotoCapture] Video play() failed:", playError);
      }

      // Wait for video to be ready with timeout
      await new Promise<void>((resolve, reject) => {
        let settled = false;

        const cleanup = () => {
          video.removeEventListener("loadeddata", onLoadedData);
          video.removeEventListener("canplay", onCanPlay);
          video.removeEventListener("error", onError);
        };

        const timeoutId = window.setTimeout(() => {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();

          if (video.readyState >= 2) {
            resolve();
          } else {
            reject(new Error("Camera initialization timeout"));
          }
        }, CAMERA_READY_TIMEOUT_MS);

        const onLoadedData = () => {
          if (settled) {
            return;
          }

          settled = true;
          window.clearTimeout(timeoutId);
          cleanup();
          resolve();
        };

        const onCanPlay = () => {
          if (settled) {
            return;
          }

          settled = true;
          window.clearTimeout(timeoutId);
          cleanup();
          resolve();
        };

        const onError = () => {
          if (settled) {
            return;
          }

          settled = true;
          window.clearTimeout(timeoutId);
          cleanup();
          reject(new Error("Video failed to load"));
        };

        if (video.readyState >= 2) {
          settled = true;
          window.clearTimeout(timeoutId);
          cleanup();
          resolve();
          return;
        }

        video.addEventListener("loadeddata", onLoadedData);
        video.addEventListener("canplay", onCanPlay);
        video.addEventListener("error", onError);
      });

      if (requestId !== startRequestIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      setIsCameraReady(true);
    } catch (err) {
      if (requestId !== startRequestIdRef.current) {
        return;
      }

      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setCameraError(
            "camera access denied — please allow camera access in your browser settings",
          );
        } else if (err.name === "NotFoundError") {
          setCameraError(
            "no camera found — please connect a camera and try again",
          );
        } else if (err.message.includes("cancelled")) {
          // Ignore cancellations from StrictMode cleanup or rapid close/reopen.
          return;
        } else if (err.message.includes("timeout")) {
          setCameraError("camera initialization timeout — please try again");
        } else {
          setCameraError(`camera error: ${err.message}`);
        }
      } else {
        setCameraError("failed to access camera");
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    startRequestIdRef.current += 1;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setPreviewUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return null;
    });
    setPhoto(null);
    setDetectedCategory(null);
    setDetectedGestureName(null);
    setCameraError(null);
    setIsCameraReady(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas context unavailable");

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
            setPreviewUrl((previous) => {
              if (previous) {
                URL.revokeObjectURL(previous);
              }

              return URL.createObjectURL(blob);
            });
          }
        },
        "image/jpeg",
        0.9,
      );
    } catch (e) {
      console.error("[usePhotoCapture] Failed to capture photo:", e);
    }
  }, [isGestureReady, processVideoFrame]);

  const retakePhoto = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhoto(null);
    setPreviewUrl(null);
    setDetectedCategory(null);
    setDetectedGestureName(null);
    setCameraError(null);

    const hasLiveTrack =
      streamRef.current
        ?.getVideoTracks()
        .some((track) => track.readyState === "live") ?? false;
    const video = videoRef.current;
    const isAttached = !!video && video.srcObject === streamRef.current;

    if (!hasLiveTrack || !isAttached) {
      void startCamera();
      return;
    }

    if (video && video.paused) {
      void video.play().catch(() => {
        // Ignore autoplay recovery errors; user interaction will retry capture.
      });
    }
  }, [previewUrl, startCamera]);

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
