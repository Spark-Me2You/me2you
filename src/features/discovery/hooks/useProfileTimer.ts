import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Options for useProfileTimer hook
 */
interface UseProfileTimerOptions {
  /** Called when timer completes successfully */
  onComplete: () => void;
  /** Duration in milliseconds (default: 5000) */
  duration?: number;
}

/**
 * Return type for useProfileTimer hook
 */
interface UseProfileTimerReturn {
  /** Progress from 0 to 100 (percentage) */
  progress: number;
  /** Whether timer is actively running */
  isActive: boolean;
  /** Start the timer */
  start: () => void;
  /** Reset timer to initial state (progress = 0, isActive = false) */
  reset: () => void;
}

/**
 * Hardcoded timer duration (3 seconds)
 */
const TIMER_DURATION = 3000;

/**
 * useProfileTimer Hook
 *
 * Manages a countdown timer with smooth progress tracking using requestAnimationFrame.
 * Used for the hands-free profile navigation feature in discovery mode.
 *
 * @param options - Configuration options including onComplete callback
 * @returns Timer state and control functions
 *
 * @example
 * ```tsx
 * const { progress, isActive, start, reset } = useProfileTimer({
 *   onComplete: () => handleViewProfile(imageData)
 * });
 * ```
 */
export const useProfileTimer = ({
  onComplete,
  duration = TIMER_DURATION,
}: UseProfileTimerOptions): UseProfileTimerReturn => {
  const [progress, setProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);

  /**
   * Animation frame callback that updates progress
   */
  const animate = useCallback(
    (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const newProgress = Math.min((elapsed / duration) * 100, 100);

      setProgress(newProgress);

      // Check if timer completed
      if (newProgress >= 100 && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        setIsActive(false);
        onComplete();
        return; // Stop animation
      }

      // Continue animation if not complete
      if (newProgress < 100) {
        rafIdRef.current = requestAnimationFrame(animate);
      }
    },
    [duration, onComplete],
  );

  /**
   * Start the timer
   */
  const start = useCallback(() => {
    // Reset refs
    startTimeRef.current = null;
    hasCompletedRef.current = false;
    setIsActive(true);
    setProgress(0);

    // Start animation loop
    rafIdRef.current = requestAnimationFrame(animate);
  }, [animate]);

  /**
   * Reset timer to initial state
   */
  const reset = useCallback(() => {
    // Cancel any running animation frame
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Reset state
    startTimeRef.current = null;
    hasCompletedRef.current = false;
    setProgress(0);
    setIsActive(false);
  }, []);

  /**
   * Cleanup animation frame on unmount
   */
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    progress,
    isActive,
    start,
    reset,
  };
};
