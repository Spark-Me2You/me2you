/**
 * CV Cursor Hook
 * Uses shared camera stream + HandLandmarker for cursor position and click detection.
 * Ready pose (thumb and index open, other fingers closed) = cursor showing,
 * palm position = cursor position, thumb-to-index pinch = click.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createHandLandmarker, closeHandLandmarker } from "./handLandmarkerLoader";
import type { HandLandmarker, NormalizedLandmark } from "./handLandmarkerLoader";
import { useSharedCamera } from "../SharedCameraProvider";
import { useCvCursorEnabled } from "./CvCursorEnabledContext";
import { IDLE_TRACKER, palmCenter, toScreen, trackCursorPose } from "./handGeometry";
import type { HandRange } from "./handGeometry";

export interface CvCursorState {
  x: number;
  y: number;
  visible: boolean;
  clicking: boolean;
  // Continuous raw pinch state (no cooldown). Use for drag/paint interactions
  // where `clicking` (one-shot) would only fire once per 300ms.
  isPinched: boolean;
  isReady: boolean;
  error: string | null;
}

// Smoothing factor for EMA (0 = no update, 1 = no smoothing)
const SMOOTHING_ALPHA = 0.35;
// Minimum ms between click events
const CLICK_COOLDOWN_MS = 300;
// Minimum ms between logged frame errors, so a persistent failure doesn't flood the console
const ERROR_LOG_INTERVAL_MS = 10_000;

// The usable range of hand movement in normalized camera space [0,1].
// Hand typically moves within a subset of the frame — map this range to the full screen.
// Adjust these if the cursor still can't reach edges.
// The palm sits lower in the frame than the fingertip, so its vertical range is lower too.
const PALM_RANGE: HandRange = { xMin: 0.15, xMax: 0.85, yMin: 0.25, yMax: 0.85 };
// Fingertip range for the raw HandTrackSample, which games steer with.
const TIP_RANGE: HandRange = { xMin: 0.15, xMax: 0.85, yMin: 0.15, yMax: 0.75 };

function screenSize() {
  return { width: window.innerWidth, height: window.innerHeight };
}

function landmarkDistance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function useCvCursor(enabled: boolean = true): CvCursorState & { videoRef: React.RefObject<HTMLVideoElement | null> } {
  const { stream } = useSharedCamera();
  const { handTrackRef } = useCvCursorEnabled();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const lastErrorLogRef = useRef(-Infinity);

  const smoothXRef = useRef(0);
  const smoothYRef = useRef(0);

  const poseTrackerRef = useRef(IDLE_TRACKER);
  const lastClickTimeRef = useRef(0);

  const [state, setState] = useState<CvCursorState>({
    x: 0,
    y: 0,
    visible: false,
    clicking: false,
    isPinched: false,
    isReady: false,
    error: null,
  });

  // One frame of work. Returns early freely; the caller always reschedules.
  const runFrame = useCallback(() => {
    const video = videoRef.current;
    const landmarker = handLandmarkerRef.current;

    if (!video || !landmarker || video.readyState < 2) return;

    // Skip every other frame (~30fps)
    frameCountRef.current++;
    if (frameCountRef.current % 2 !== 0) return;

    // MediaPipe requires strictly increasing timestamps; the wall clock can step back.
    const results = landmarker.detectForVideo(video, performance.now());

    // Publish the raw sample before any pose gating so games get every hand.
    const sample = handTrackRef.current;
    const detectedLandmarks = results.landmarks?.[0];
    sample.detected = !!detectedLandmarks;
    sample.timestamp = performance.now();
    sample.frameId++;
    if (detectedLandmarks) {
      const tip = toScreen(detectedLandmarks[8], TIP_RANGE, screenSize());
      sample.tipX = tip.x;
      sample.tipY = tip.y;
      sample.handScale = landmarkDistance(detectedLandmarks[0], detectedLandmarks[9]);
      sample.wristX = detectedLandmarks[0].x;
      sample.wristY = detectedLandmarks[0].y;
    }

    const now = Date.now();
    const aspect = video.videoWidth / video.videoHeight || 1;
    const wasPinched = poseTrackerRef.current.pose.pinched;
    poseTrackerRef.current = trackCursorPose(
      poseTrackerRef.current,
      detectedLandmarks ?? null,
      aspect,
      now,
    );
    const pose = poseTrackerRef.current.pose;

    if (!pose.active) {
      setState((prev) =>
        prev.visible ? { ...prev, visible: false, clicking: false, isPinched: false } : prev,
      );
      return;
    }

    // Hand dropped out but the pose is being held: leave the cursor where it was.
    if (!detectedLandmarks) {
      setState((prev) => (prev.clicking ? { ...prev, clicking: false } : prev));
      return;
    }

    // Cursor position from the palm, which stays put while the fingers pinch.
    const { x: rawX, y: rawY } = toScreen(palmCenter(detectedLandmarks), PALM_RANGE, screenSize());

    smoothXRef.current =
      SMOOTHING_ALPHA * rawX + (1 - SMOOTHING_ALPHA) * smoothXRef.current;
    smoothYRef.current =
      SMOOTHING_ALPHA * rawY + (1 - SMOOTHING_ALPHA) * smoothYRef.current;

    const x = Math.round(smoothXRef.current);
    const y = Math.round(smoothYRef.current);

    let clicking = false;
    if (pose.pinched && !wasPinched && now - lastClickTimeRef.current > CLICK_COOLDOWN_MS) {
      clicking = true;
      lastClickTimeRef.current = now;
    }

    setState({ x, y, visible: true, clicking, isPinched: pose.pinched, isReady: true, error: null });
  }, [handTrackRef]);

  const processFrame = useCallback(() => {
    try {
      runFrame();
    } catch (err) {
      // A single bad frame must never kill the cursor: log (rate limited) and carry on.
      const t = performance.now();
      if (t - lastErrorLogRef.current > ERROR_LOG_INTERVAL_MS) {
        lastErrorLogRef.current = t;
        console.error("[useCvCursor] frame processing failed:", err);
      }
    }
    rafRef.current = requestAnimationFrame(processFrame);
  }, [runFrame]);

  // Attach shared stream to our hidden video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Init HandLandmarker and start frame loop
  useEffect(() => {
    if (!enabled || !stream) {
      poseTrackerRef.current = IDLE_TRACKER;
      setState((prev) => ({ ...prev, visible: false, clicking: false, isPinched: false }));
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        const landmarker = await createHandLandmarker();
        if (cancelled) return;

        handLandmarkerRef.current = landmarker;
        setState((prev) => ({ ...prev, isReady: true }));

        rafRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            error: err instanceof Error ? err.message : "Failed to initialize CV cursor",
          }));
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      closeHandLandmarker();
      handLandmarkerRef.current = null;
    };
  }, [enabled, stream, processFrame]);

  return { ...state, videoRef };
}
