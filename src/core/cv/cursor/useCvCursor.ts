/**
 * CV Cursor Hook
 * Uses shared camera stream + HandLandmarker for cursor position and click detection.
 * Index knuckle = cursor position, thumb curl = click.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createHandLandmarker, closeHandLandmarker } from "./handLandmarkerLoader";
import type { HandLandmarker } from "./handLandmarkerLoader";
import { useSharedCamera } from "../SharedCameraProvider";
import { ThumbClickDetector, isPointingPose, thumbClosureRatio } from "./handGesture";

export interface CvCursorState {
  x: number;
  y: number;
  visible: boolean;
  // True only on the frame a click fires. Drives the click animation.
  clicking: boolean;
  // Increments once per click; consumers dispatch a click when it changes, so a
  // click can't be lost to render batching the way a one-frame boolean can.
  clickId: number;
  // Where the click lands: the cursor position from just before the thumb began
  // to curl, so the press itself doesn't drag the click off its target.
  clickX: number;
  clickY: number;
  // Continuous raw pinch state (no cooldown). Use for drag/paint interactions
  // where `clicking` (one-shot) would only fire once per click.
  isPinched: boolean;
  isReady: boolean;
  error: string | null;
}

// Smoothing factor for EMA (0 = no update, 1 = no smoothing)
const SMOOTHING_ALPHA = 0.35;
// Frames the hand/pose may drop out before the cursor hides. Rides over
// single-frame tracking glitches instead of flickering (and re-acquiring).
const LOST_GRACE_FRAMES = 3;
// Process at most one detection per ~camera frame (30fps).
const MIN_FRAME_INTERVAL_MS = 30;

// The usable range of hand movement in normalized camera space [0,1], mapped to
// the full screen. The cursor follows the index knuckle (landmark 5) rather than
// the fingertip: it barely moves when the thumb curls to click, and these bounds
// keep the whole hand (thumb + wrist) inside the camera frame at every screen
// edge, so the thumb is still tracked when clicking near the borders.
const HAND_X_MIN = 0.2;
const HAND_X_MAX = 0.8;
const HAND_Y_MIN = 0.25;
const HAND_Y_MAX = 0.7;
const CURSOR_LANDMARK = 5;

export function useCvCursor(enabled: boolean = true): CvCursorState & { videoRef: React.RefObject<HTMLVideoElement | null> } {
  const { stream } = useSharedCamera();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const lastVideoTimeRef = useRef(-1);
  const lastProcessedRef = useRef(0);

  const smoothXRef = useRef(0);
  const smoothYRef = useRef(0);
  const trackingRef = useRef(false);
  const lostFramesRef = useRef(0);

  const detectorRef = useRef(new ThumbClickDetector());
  const clickIdRef = useRef(0);
  const openPosRef = useRef({ x: 0, y: 0 });

  const [state, setState] = useState<CvCursorState>({
    x: 0,
    y: 0,
    visible: false,
    clicking: false,
    clickId: 0,
    clickX: 0,
    clickY: 0,
    isPinched: false,
    isReady: false,
    error: null,
  });

  const processFrame = useCallback(() => {
    rafRef.current = requestAnimationFrame(processFrame);

    const video = videoRef.current;
    const landmarker = handLandmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) return;

    // Only run detection on new camera frames, at most ~30fps, so the
    // frame-count thresholds below mean the same thing on every machine.
    const now = performance.now();
    if (video.currentTime === lastVideoTimeRef.current || now - lastProcessedRef.current < MIN_FRAME_INTERVAL_MS) {
      return;
    }
    lastVideoTimeRef.current = video.currentTime;
    lastProcessedRef.current = now;

    const results = landmarker.detectForVideo(video, now);
    const landmarks = results.landmarks?.[0];
    const world = results.worldLandmarks?.[0];

    if (!landmarks || !world || !isPointingPose(world)) {
      // Hold the cursor through brief dropouts; only hide (and forget the
      // click state) once tracking has been gone for a few frames.
      if (trackingRef.current && ++lostFramesRef.current >= LOST_GRACE_FRAMES) {
        trackingRef.current = false;
        detectorRef.current.reset();
        setState((prev) => ({ ...prev, visible: false, clicking: false, isPinched: false }));
      } else {
        setState((prev) => (prev.clicking ? { ...prev, clicking: false } : prev));
      }
      return;
    }
    lostFramesRef.current = 0;

    // Mirror X for the front camera; remap the usable hand range to full screen.
    const anchor = landmarks[CURSOR_LANDMARK];
    const normX = Math.min(1, Math.max(0, (anchor.x - HAND_X_MIN) / (HAND_X_MAX - HAND_X_MIN)));
    const normY = Math.min(1, Math.max(0, (anchor.y - HAND_Y_MIN) / (HAND_Y_MAX - HAND_Y_MIN)));
    const rawX = (1 - normX) * window.innerWidth;
    const rawY = normY * window.innerHeight;

    if (!trackingRef.current) {
      // Newly acquired hand: jump straight there instead of easing across the
      // screen from wherever the cursor was last seen.
      trackingRef.current = true;
      smoothXRef.current = rawX;
      smoothYRef.current = rawY;
    } else {
      smoothXRef.current = SMOOTHING_ALPHA * rawX + (1 - SMOOTHING_ALPHA) * smoothXRef.current;
      smoothYRef.current = SMOOTHING_ALPHA * rawY + (1 - SMOOTHING_ALPHA) * smoothYRef.current;
    }

    const x = Math.round(smoothXRef.current);
    const y = Math.round(smoothYRef.current);

    const detector = detectorRef.current;
    const clicking = detector.update(thumbClosureRatio(world));
    if (clicking) clickIdRef.current++;
    else if (!detector.pinched) openPosRef.current = { x, y };

    setState({
      x,
      y,
      visible: true,
      clicking,
      clickId: clickIdRef.current,
      clickX: openPosRef.current.x,
      clickY: openPosRef.current.y,
      isPinched: detector.pinched,
      isReady: true,
      error: null,
    });
  }, []);

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
      setState((prev) => ({ ...prev, visible: false, clicking: false, isPinched: false }));
      return;
    }

    let cancelled = false;
    const detector = detectorRef.current;

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
      trackingRef.current = false;
      lostFramesRef.current = 0;
      detector.reset();
    };
  }, [enabled, stream, processFrame]);

  return { ...state, videoRef };
}
