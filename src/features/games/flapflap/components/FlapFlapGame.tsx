/**
 * FlapFlap Game Component
 * Integrates PixiJS game engine with pose detection and React
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import { usePixiApp } from "../../hooks/usePixiApp";
import {
  usePoseDetection,
  POSE_PROCESS_INTERVAL_MS,
} from "../../hooks/usePoseDetection";
import { useArmFlap } from "../hooks/useArmFlap";
import { CameraOverlay } from "../../components/CameraOverlay";
import { FlapFlapEngine } from "../game/FlapFlapEngine";
import type { FlapFlapState } from "../game/FlapFlapEngine";
import { FLAPFLAP_CONFIG } from "../config/flapflapConfig";
import { useCvCursorEnabled } from "@/core/cv/cursor";
import type { GameProps } from "../../types/game";
import { GameOverClaim } from "./GameOverClaim";
import styles from "./FlapFlapGame.module.css";

export const FlapFlapGame: React.FC<GameProps> = ({
  onExit,
  onScoreChange,
}) => {
  const { setEnabled: setCvCursorEnabled, cursorVisibleRef } = useCvCursorEnabled();

  const [gameState, setGameState] = useState<FlapFlapState>("READY");
  const [finalScore, setFinalScore] = useState(0);

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
  const handleGameStateChange = useCallback(
    (state: FlapFlapState) => {
      // Pixi-side mutations are safe to call synchronously from the RAF context.
      if (state === "GAME_OVER") {
        engineRef.current?.setRestartLocked(true);
        engineRef.current?.setMessageVisible(false);
      }
      // Defer React state updates out of the PixiJS RAF callback context.
      // Calling setState directly inside a RAF (via ticker → engine → onStateChange)
      // can corrupt React's fiber linked list in some batching edge cases.
      setTimeout(() => {
        setCvCursorEnabled(state !== "PLAYING");
        if (state === "GAME_OVER") {
          setFinalScore(engineRef.current?.getScore() ?? 0);
          setGameState("GAME_OVER");
        } else {
          setGameState(state);
        }
      }, 0);
    },
    [setCvCursorEnabled],
  );

  const handlePlayAgain = useCallback(() => {
    engineRef.current?.restart();
    setGameState("READY");
    setFinalScore(0);
  }, []);

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
    engine.setCallbacks(handleGameStateChange, (score) =>
      onScoreChange?.(score),
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
      // Skip flap detection while the CV cursor's pointing pose is active —
      // moving the pointing hand would otherwise false-trigger a flap.
      const currentFrameSequence = frameSequenceRef.current;
      const currentLandmarks = landmarksRef.current;
      if (
        currentLandmarks &&
        currentFrameSequence !== lastProcessedFrameSequence
      ) {
        if (!cursorVisibleRef.current) {
          processLandmarksRef.current(currentLandmarks);
        }
        lastProcessedFrameSequence = currentFrameSequence;
      }
    };

    ticker.add(tickerCallback);

    return () => {
      ticker.remove(tickerCallback);
      engine.destroy();
      engineRef.current = null;
    };
  }, [app, isReady, onScoreChange, landmarksRef, frameSequenceRef, handleGameStateChange, cursorVisibleRef]);

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
      <div ref={containerRef} className={styles.gameCanvas}>
        {gameState === "GAME_OVER" && (
          <GameOverClaim score={finalScore} onPlayAgain={handlePlayAgain} />
        )}
      </div>

      <CameraOverlay onVideoReady={handleVideoReady} />

      <button className={styles.exitButton} onClick={onExit}>
        exit
      </button>
    </div>
  );
};
