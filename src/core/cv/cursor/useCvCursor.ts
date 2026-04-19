/**
 * CV Cursor Hook
 * Uses shared camera stream + HandLandmarker for cursor position and click detection.
 * Index finger tip = cursor position, thumb curl = click.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createHandLandmarker, closeHandLandmarker } from "./handLandmarkerLoader";
import type { HandLandmarker, NormalizedLandmark } from "./handLandmarkerLoader";
import { useSharedCamera } from "../SharedCameraProvider";

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
// Normalized distance threshold for thumb curl detection
const CLICK_DISTANCE_THRESHOLD = 0.06;
// Minimum ms between click events
const CLICK_COOLDOWN_MS = 300;

// The usable range of hand movement in normalized camera space [0,1].
// Hand typically moves within a subset of the frame — map this range to the full screen.
// Adjust these if the cursor still can't reach edges.
const HAND_X_MIN = 0.15;
const HAND_X_MAX = 0.85;
const HAND_Y_MIN = 0.15;
const HAND_Y_MAX = 0.75;

/**
 * Check if the hand is in a pointing pose:
 * - Index finger extended (tip above PIP joint)
 * - Middle, ring, pinky curled (tips below their PIP joints)
 */
function isPointingPose(landmarks: NormalizedLandmark[]): boolean {
  const indexExtended = landmarks[8].y < landmarks[6].y;
  const middleCurled = landmarks[12].y > landmarks[10].y;
  const ringCurled = landmarks[16].y > landmarks[14].y;
  const pinkyCurled = landmarks[20].y > landmarks[18].y;

  return indexExtended && middleCurled && ringCurled && pinkyCurled;
}

function landmarkDistance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function useCvCursor(enabled: boolean = true): CvCursorState & { videoRef: React.RefObject<HTMLVideoElement | null> } {
  const { stream } = useSharedCamera();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const frameCountRef = useRef(0);

  const smoothXRef = useRef(0);
  const smoothYRef = useRef(0);

  const wasClickingRef = useRef(false);
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

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const landmarker = handLandmarkerRef.current;

    if (!video || !landmarker || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Skip every other frame (~30fps)
    frameCountRef.current++;
    if (frameCountRef.current % 2 !== 0) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const results = landmarker.detectForVideo(video, Date.now());

    if (!results.landmarks || results.landmarks.length === 0) {
      setState((prev) =>
        prev.visible ? { ...prev, visible: false, clicking: false, isPinched: false } : prev,
      );
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const landmarks = results.landmarks[0];

    if (!isPointingPose(landmarks)) {
      setState((prev) =>
        prev.visible ? { ...prev, visible: false, clicking: false, isPinched: false } : prev,
      );
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Cursor position from index finger tip (landmark 8), mirrored for front camera.
    // Remap the usable hand range to full screen so edges are reachable.
    const normX = Math.min(1, Math.max(0, (landmarks[8].x - HAND_X_MIN) / (HAND_X_MAX - HAND_X_MIN)));
    const normY = Math.min(1, Math.max(0, (landmarks[8].y - HAND_Y_MIN) / (HAND_Y_MAX - HAND_Y_MIN)));
    const rawX = (1 - normX) * window.innerWidth;
    const rawY = normY * window.innerHeight;

    smoothXRef.current =
      SMOOTHING_ALPHA * rawX + (1 - SMOOTHING_ALPHA) * smoothXRef.current;
    smoothYRef.current =
      SMOOTHING_ALPHA * rawY + (1 - SMOOTHING_ALPHA) * smoothYRef.current;

    const x = Math.round(smoothXRef.current);
    const y = Math.round(smoothYRef.current);

    // Click detection: thumb tip (4) to index MCP (5) distance
    const thumbDist = landmarkDistance(landmarks[4], landmarks[5]);
    const isClicking = thumbDist < CLICK_DISTANCE_THRESHOLD;

    const now = Date.now();
    let clicking = false;
    if (isClicking && !wasClickingRef.current && now - lastClickTimeRef.current > CLICK_COOLDOWN_MS) {
      clicking = true;
      lastClickTimeRef.current = now;
    }
    wasClickingRef.current = isClicking;

    setState({ x, y, visible: true, clicking, isPinched: isClicking, isReady: true, error: null });

    rafRef.current = requestAnimationFrame(processFrame);
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
      setState((prev) => ({ ...prev, visible: false, clicking: false }));
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
