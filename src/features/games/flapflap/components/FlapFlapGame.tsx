/**
 * FlapFlap Game Component
 * Integrates PixiJS game engine with pose detection and React
 */

import React, { useRef, useEffect, useCallback } from "react";
import { usePixiApp } from "../../hooks/usePixiApp";
import { useGameLoop } from "../../hooks/useGameLoop";
import { usePoseDetection } from "../../hooks/usePoseDetection";
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
  });

  const engineRef = useRef<FlapFlapEngine | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Pose detection hooks
  const { landmarksRef, isInitialized: poseReady, processFrame } = usePoseDetection();
  const { flapDetected, processLandmarks } = useArmFlap({
    velocityThreshold: 0.012,
    bufferSize: 4,
    cooldownMs: 250,
  });

  // Initialize game engine when PixiJS is ready
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

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [app, isReady, onScoreChange]);

  // Trigger flap when detected
  useEffect(() => {
    if (flapDetected && engineRef.current) {
      engineRef.current.flap();
    }
  }, [flapDetected]);

  // Game physics update
  const handleUpdate = useCallback((deltaTime: number) => {
    engineRef.current?.update(deltaTime);

    // Process landmarks from ref (no state dependency)
    const currentLandmarks = landmarksRef.current;
    if (currentLandmarks) {
      processLandmarks(currentLandmarks);
    }
  }, [landmarksRef, processLandmarks]);

  // Camera frame processing for pose detection (runs once per frame)
  const handleVideoFrame = useCallback(() => {
    if (videoRef.current && poseReady) {
      processFrame(videoRef.current, performance.now());
    }
  }, [poseReady, processFrame]);

  // Separate game loop - physics at 60 FPS, pose detection throttled to 30 FPS
  useGameLoop({
    onUpdate: handleUpdate,  // Physics only
    onRender: handleVideoFrame,  // Pose detection (throttled internally)
    paused: false,
  });

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video;
  }, []);

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
