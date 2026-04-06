/**
 * PixiJS Application Hook
 * Manages PixiJS Application lifecycle and canvas integration with React
 */

import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";

interface UsePixiAppOptions {
  width: number;
  height: number;
  backgroundColor?: number;
  resolution?: number;
}

interface UsePixiAppReturn {
  app: Application | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isReady: boolean;
}

export const usePixiApp = (options: UsePixiAppOptions): UsePixiAppReturn => {
  const {
    width,
    height,
    backgroundColor = 0x87ceeb,
    resolution = window.devicePixelRatio,
  } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear any existing canvases first
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const app = new Application();
    let cleanedUp = false;

    const init = async () => {
      await app.init({
        width,
        height,
        backgroundColor,
        resolution,
        autoDensity: true,
      });

      if (cleanedUp) {
        // Component unmounted before init resolved — destroy orphaned app so
        // its ticker doesn't keep running and leaking memory.
        app.destroy({ removeView: true });
        return;
      }

      // FlapFlap uses MediaPipe for all input — disable canvas pointer events
      // so HTML buttons (exit button) always receive clicks.
      app.canvas.style.pointerEvents = "none";
      container.appendChild(app.canvas);
      appRef.current = app;
      setIsReady(true);
    };

    init();

    return () => {
      cleanedUp = true;
      if (appRef.current) {
        // Stop the ticker synchronously so no RAF fires during teardown.
        appRef.current.ticker.stop();

        // Defer app.destroy() to the next macrotask. This is critical because
        // React runs useEffect cleanups in the order the hooks were defined.
        // usePixiApp is defined BEFORE the engine useEffect, so this cleanup
        // runs first. If we destroy the ticker here (ticker._head = null),
        // the engine cleanup that follows will crash when it calls
        // ticker.remove(tickerCallback) — "Cannot read .next of null".
        // By deferring, all React cleanup effects (including the engine's
        // ticker.remove) complete safely before the ticker is torn down.
        const appToDestroy = appRef.current;
        setTimeout(() => appToDestroy.destroy({ removeView: true }), 0);

        appRef.current = null;
      }
    };
  }, [width, height, backgroundColor, resolution]);

  return { app: appRef.current, containerRef, isReady };
};
