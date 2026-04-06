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

    const init = async () => {
      await app.init({
        width,
        height,
        backgroundColor,
        resolution,
        autoDensity: true,
      });

      if (container && !appRef.current) {
        // FlapFlap uses MediaPipe for all input — canvas should never intercept
        // pointer events (would block HTML buttons rendered above the canvas).
        app.canvas.style.pointerEvents = "none";
        container.appendChild(app.canvas);
        appRef.current = app;
        setIsReady(true);
      }
    };

    init();

    return () => {
      if (appRef.current) {
        appRef.current.destroy({ removeView: true });
        appRef.current = null;
        setIsReady(false);
      }
    };
  }, [width, height, backgroundColor, resolution]);

  return { app: appRef.current, containerRef, isReady };
};
