import { useState, useRef, useCallback, useEffect } from "react";
import { useGestureRecognition } from "@/features/discovery/hooks/useGestureRecognition";
import { getCategoryFromGesture } from "@/features/discovery/config/gestureMapping";
import type { GestureCategory } from "../types/profileTypes";
import { pickPose, type PoseSample } from "../utils/poseVotes";

const VIDEO_REF_WAIT_TIMEOUT_MS = 3000;
const CAMERA_READY_TIMEOUT_MS = 8000;

/** How often the live camera is classified (~10 fps). */
const SAMPLE_INTERVAL_MS = 100;
/** The live "✓ peace sign" label reflects this much recent video. */
const LIVE_WINDOW_MS = 800;
/**
 * A capture is judged on frames from this long before the shutter until this
 * long after it. The "checking your pose . . ." step is the time after.
 */
const CAPTURE_WINDOW_MS = 700;
const SAMPLE_HISTORY_MS = 2000;

/**
 * live: camera preview, pose shown as it's detected
 * classifying: photo taken, still sampling the video to decide the pose
 * detected / failed: always where a capture ends, so the screen never hangs
 */
export type CapturePhase = "live" | "classifying" | "detected" | "failed";

interface UsePhotoCaptureResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  photo: Blob | null;
  previewUrl: string | null;
  phase: CapturePhase;
  /** Pose currently seen on the live camera, before capture. */
  liveCategory: GestureCategory | null;
  /** Pose of the captured photo; set when phase is "detected". */
  detectedCategory: GestureCategory | null;
  isCameraReady: boolean;
  isGestureReady: boolean;
  /** Pose detection failed to load (e.g. model download failed). */
  gestureError: string | null;
  cameraError: string | null;
  capturePhoto: () => void;
  retakePhoto: () => void;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

const toCategory = (gestureName: string | null | undefined): GestureCategory | null =>
  (getCategoryFromGesture(gestureName ?? null) as GestureCategory | null) ?? null;

export const usePhotoCapture = (): UsePhotoCaptureResult => {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<CapturePhase>("live");
  const [liveCategory, setLiveCategory] = useState<GestureCategory | null>(null);
  const [detectedCategory, setDetectedCategory] =
    useState<GestureCategory | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startRequestIdRef = useRef(0);
  const samplesRef = useRef<PoseSample[]>([]);
  const decideTimerRef = useRef<number | null>(null);

  const {
    isInitialized: isGestureReady,
    error: gestureLoadError,
    recognizeFrame,
  } = useGestureRecognition();

  const gestureError = gestureLoadError
    ? "couldn't load pose detection — check your connection and reload the page"
    : null;

  const clearDecideTimer = () => {
    if (decideTimerRef.current !== null) {
      window.clearTimeout(decideTimerRef.current);
      decideTimerRef.current = null;
    }
  };

  // Classify the live video while the camera is showing (and while a capture
  // is being checked). Every frame yields a sample, including "no pose", so
  // the result never depends on the gesture changing.
  const isSampling = isCameraReady && isGestureReady && (phase === "live" || phase === "classifying");
  useEffect(() => {
    if (!isSampling) return;
    const id = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const now = performance.now();
      const result = recognizeFrame(video, now);
      const samples = samplesRef.current;
      samples.push({ category: toCategory(result?.gestureName), at: now });
      while (samples.length && samples[0].at < now - SAMPLE_HISTORY_MS) samples.shift();
      const live = pickPose(samples, now - LIVE_WINDOW_MS, now);
      setLiveCategory((prev) => (prev === live ? prev : live));
    }, SAMPLE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isSampling, recognizeFrame]);

  useEffect(() => clearDecideTimer, []);

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
    clearDecideTimer();
    samplesRef.current = [];
    setPhase("live");
    setLiveCategory(null);
    setDetectedCategory(null);
    setCameraError(null);
    setIsCameraReady(false);
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    clearDecideTimer();
    setDetectedCategory(null);
    setPhase("classifying");
    const shutterAt = performance.now();

    const fail = () => {
      clearDecideTimer();
      setPhase("failed");
    };

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas context unavailable");

      // Mirror the image (like a selfie)
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            fail();
            return;
          }
          setPhoto(blob);
          setPreviewUrl((previous) => {
            if (previous) URL.revokeObjectURL(previous);
            return URL.createObjectURL(blob);
          });
        },
        "image/jpeg",
        0.9,
      );

      // Keep sampling briefly after the shutter, then decide. This always
      // settles on "detected" or "failed".
      decideTimerRef.current = window.setTimeout(() => {
        decideTimerRef.current = null;
        const category = pickPose(
          samplesRef.current,
          shutterAt - CAPTURE_WINDOW_MS,
          shutterAt + CAPTURE_WINDOW_MS,
        );
        setDetectedCategory(category);
        setPhase(category ? "detected" : "failed");
      }, CAPTURE_WINDOW_MS);
    } catch (e) {
      console.error("[usePhotoCapture] Failed to capture photo:", e);
      fail();
    }
  }, []);

  const retakePhoto = useCallback(() => {
    clearDecideTimer();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhoto(null);
    setPreviewUrl(null);
    samplesRef.current = [];
    setPhase("live");
    setLiveCategory(null);
    setDetectedCategory(null);
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
    phase,
    liveCategory,
    detectedCategory,
    isCameraReady,
    isGestureReady,
    gestureError,
    cameraError,
    capturePhoto,
    retakePhoto,
    startCamera,
    stopCamera,
  };
};
