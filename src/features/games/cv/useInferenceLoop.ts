/**
 * Runs a detector against the game's video on its own timer, separate from the
 * Pixi ticker, so slow inference can't stall rendering or physics. Results stay
 * in the detector's refs for the ticker to read.
 */

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { POSE_PROCESS_INTERVAL_MS } from "../hooks/usePoseDetection";

interface UseInferenceLoopOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Called with a video that has frames, e.g. usePoseDetection's processFrame. */
  detect: (video: HTMLVideoElement, timestamp: number) => void;
  /** Usually the detector's isInitialized. */
  enabled?: boolean;
  intervalMs?: number;
}

export const useInferenceLoop = ({
  videoRef,
  detect,
  enabled = true,
  intervalMs = POSE_PROCESS_INTERVAL_MS,
}: UseInferenceLoopOptions): void => {
  const detectRef = useRef(detect);

  useEffect(() => {
    detectRef.current = detect;
  }, [detect]);

  useEffect(() => {
    if (!enabled) return;

    const intervalId = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || video.readyState < 2) return;
      detectRef.current(video, performance.now());
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [enabled, intervalMs, videoRef]);
};
