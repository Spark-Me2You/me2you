/**
 * Game Loop Hook
 * Provides a fixed-timestep game loop using requestAnimationFrame
 */

import { useEffect, useRef, useCallback } from "react";

interface UseGameLoopOptions {
  onUpdate: (deltaTime: number) => void;
  onRender?: () => void;
  targetFPS?: number;
  paused?: boolean;
}

export const useGameLoop = (options: UseGameLoopOptions) => {
  const { onUpdate, onRender, targetFPS = 60, paused = false } = options;
  const lastTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  const frameTime = 1000 / targetFPS;

  const loop = useCallback(
    (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (!paused) {
        // Fixed timestep for physics
        accumulatorRef.current += deltaTime;

        while (accumulatorRef.current >= frameTime) {
          onUpdate(frameTime / 1000); // Pass delta in seconds
          accumulatorRef.current -= frameTime;
        }

        onRender?.();
      }

      rafIdRef.current = requestAnimationFrame(loop);
    },
    [onUpdate, onRender, paused, frameTime],
  );

  useEffect(() => {
    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [loop]);
};
