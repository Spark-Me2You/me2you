/**
 * FlapFlap Game Component
 * Integrates PixiJS game engine with pose detection and React
 */

import React, { useRef, useEffect, useCallback } from "react";
import { usePixiApp } from "../../hooks/usePixiApp";
import {
  usePoseDetection,
  POSE_PROCESS_INTERVAL_MS,
} from "../../hooks/usePoseDetection";
import { useArmFlap } from "../hooks/useArmFlap";
import { CameraOverlay } from "../../components/CameraOverlay";
import { FlapFlapEngine } from "../game/FlapFlapEngine";
import { FLAPFLAP_CONFIG } from "../config/flapflapConfig";
import type { GameProps } from "../../types/game";
import styles from "./FlapFlapGame.module.css";

export const FlapFlapGame: React.FC<GameProps> = ({
  onExit,
  onScoreChange,
}) => {
  const { app, containerRef, isReady } = usePixiApp({
    width: FLAPFLAP_CONFIG.GAME_WIDTH,
    height: FLAPFLAP_CONFIG.GAME_HEIGHT,
    backgroundColor: FLAPFLAP_CONFIG.SKY_COLOR,
    resolution: Math.min(window.devicePixelRatio, 1.25),
  });

  const engineRef = useRef<FlapFlapEngine | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Pose detection hooks
  const {
    landmarksRef,
    frameSequenceRef,
    isInitialized: poseReady,
    processFrame,
  } = usePoseDetection();
  const handleFlap = useCallback(() => {
    engineRef.current?.flap();
  }, []);

  const { processLandmarks } = useArmFlap({
    velocityThreshold: 0.014,
    bufferSize: 3,
    cooldownMs: 230,
    publishState: false,
    onFlap: handleFlap,
  });

  // Store callbacks in refs to prevent recreation
  const processLandmarksRef = useRef(processLandmarks);
  const processFrameRef = useRef(processFrame);
  const poseReadyRef = useRef(poseReady);

  // Update refs when callbacks change
  useEffect(() => {
    processLandmarksRef.current = processLandmarks;
    processFrameRef.current = processFrame;
    poseReadyRef.current = poseReady;
  }, [processLandmarks, processFrame, poseReady]);

  // Initialize game engine and PixiJS ticker game loop
  useEffect(() => {
    if (!app || !isReady) return;

    const engine = new FlapFlapEngine(app);
    engine.setCallbacks(
      () => {
        // State change callback (unused for now)
      },
      (score) => onScoreChange?.(score),
    );
    engineRef.current = engine;
    const FIXED_STEP_SECONDS = 1 / 60;
    const MAX_UPDATE_STEPS = 4;
    let accumulator = 0;
    let lastProcessedFrameSequence = -1;

    // Use PixiJS ticker for game loop (single unified animation system)
    const ticker = app.ticker;
    const tickerCallback = (time: any) => {
      const deltaTime = Math.min(time.deltaMS / 1000, 0.05);
      accumulator += deltaTime;

      // Fixed-step simulation improves consistency under frame drops.
      let steps = 0;
      while (accumulator >= FIXED_STEP_SECONDS && steps < MAX_UPDATE_STEPS) {
        engineRef.current?.update(FIXED_STEP_SECONDS);
        accumulator -= FIXED_STEP_SECONDS;
        steps += 1;
      }

      // Only process freshly inferred landmarks once.
      const currentFrameSequence = frameSequenceRef.current;
      const currentLandmarks = landmarksRef.current;
      if (
        currentLandmarks &&
        currentFrameSequence !== lastProcessedFrameSequence
      ) {
        processLandmarksRef.current(currentLandmarks);
        lastProcessedFrameSequence = currentFrameSequence;
      }
    };

    ticker.add(tickerCallback);

    return () => {
      ticker.remove(tickerCallback);
      engine.destroy();
      engineRef.current = null;
    };
  }, [app, isReady, onScoreChange, landmarksRef, frameSequenceRef]);

  // Run CV inference in a separate cadence from render/physics ticker.
  useEffect(() => {
    if (!poseReady) return;

    const intervalId = window.setInterval(() => {
      if (!videoRef.current || !poseReadyRef.current) return;
      processFrameRef.current(videoRef.current, performance.now());
    }, POSE_PROCESS_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [poseReady]);

  const handleVideoReady = (video: HTMLVideoElement) => {
    videoRef.current = video;
  };

  // Keyboard fallback for testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        engineRef.current?.flap();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={styles.container}>
      <div ref={containerRef} className={styles.gameCanvas} />

      <CameraOverlay onVideoReady={handleVideoReady} />

      <button className={styles.exitButton} onClick={onExit}>
        exit
      </button>
    </div>
  );
};
