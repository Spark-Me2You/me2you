/**
 * FlapFlap 2P Game Component
 * Two players share the camera (split down the middle) and race in one world.
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import type { Ticker } from "pixi.js";
import { usePixiApp } from "../../hooks/usePixiApp";
import {
  usePoseDetection,
  POSE_PROCESS_INTERVAL_MS,
} from "../../hooks/usePoseDetection";
import { useArmFlap } from "../../flapflap/hooks/useArmFlap";
import { FLAPFLAP_CONFIG } from "../../flapflap/config/flapflapConfig";
import { FlapFlap2PEngine } from "../game/FlapFlap2PEngine";
import { FLAPFLAP_2P_CONFIG } from "../config/flapflap2pConfig";
import { assignPosesToPlayers } from "../utils/assignPlayers";
import type {
  FlapFlap2PState,
  FlapFlap2PResult,
  PlayerId,
} from "../types/flapflap2p";
import { useCvCursorEnabled } from "@/core/cv/cursor";
import { ExitButton } from "@/shared/components";
import type { GameProps } from "../../types/game";
import { SplitCameraPanel } from "./SplitCameraPanel";
import { BTN_MD, BTN_PRIMARY, GAME_OVER_SCRIM } from "../../components/gameUi";

const NOT_READY: Record<PlayerId, boolean> = { P1: false, P2: false };
const PRESENCE_POLL_MS = 250;

export const FlapFlap2PGame: React.FC<GameProps> = ({ onExit }) => {
  const { setEnabled: setCvCursorEnabled, cursorVisibleRef } =
    useCvCursorEnabled();

  const [gameState, setGameState] = useState<FlapFlap2PState>("WAITING");
  const [result, setResult] = useState<FlapFlap2PResult | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [ready, setReady] = useState<Record<PlayerId, boolean>>(NOT_READY);
  const [present, setPresent] = useState<Record<PlayerId, boolean>>(NOT_READY);

  const { app, containerRef, isReady } = usePixiApp({
    width: FLAPFLAP_CONFIG.GAME_WIDTH,
    height: FLAPFLAP_CONFIG.GAME_HEIGHT,
    backgroundColor: FLAPFLAP_CONFIG.SKY_COLOR,
    resolution: Math.min(window.devicePixelRatio, 1.25),
  });

  const engineRef = useRef<FlapFlap2PEngine | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const presentRef = useRef<Record<PlayerId, boolean>>(NOT_READY);
  const [canvasScale, setCanvasScale] = useState(1);

  const {
    allLandmarksRef,
    frameSequenceRef,
    isInitialized: poseReady,
    processFrame,
  } = usePoseDetection({ numPoses: FLAPFLAP_2P_CONFIG.NUM_POSES });

  const handleGameStateChange = useCallback(
    (state: FlapFlap2PState) => {
      // Defer React state updates out of the PixiJS RAF callback context
      // (see FlapFlapGame for why).
      setTimeout(() => {
        setCvCursorEnabled(state !== "PLAYING" && state !== "COUNTDOWN");
        if (state === "GAME_OVER") {
          setResult(engineRef.current?.getResult() ?? null);
          setFinalScore(engineRef.current?.getScore() ?? 0);
        }
        setGameState(state);
      }, 0);
    },
    [setCvCursorEnabled],
  );

  const handleReadyChange = useCallback(
    (nextReady: Record<PlayerId, boolean>) => {
      setTimeout(() => setReady(nextReady), 0);
    },
    [],
  );

  const handlePlayAgain = useCallback(() => {
    engineRef.current?.restart();
    setResult(null);
    setFinalScore(0);
  }, []);

  const handleFlapP1 = useCallback(() => engineRef.current?.flap("P1"), []);
  const handleFlapP2 = useCallback(() => engineRef.current?.flap("P2"), []);

  // One detector per player so each has its own wrist buffers and cooldown.
  const armFlapOptions = {
    velocityThreshold: 0.014,
    bufferSize: 3,
    cooldownMs: 230,
    publishState: false,
  };
  const { processLandmarks: processP1 } = useArmFlap({
    ...armFlapOptions,
    onFlap: handleFlapP1,
  });
  const { processLandmarks: processP2 } = useArmFlap({
    ...armFlapOptions,
    onFlap: handleFlapP2,
  });

  // Store callbacks in refs to prevent recreation
  const processPlayerRef = useRef({ P1: processP1, P2: processP2 });
  const processFrameRef = useRef(processFrame);
  const poseReadyRef = useRef(poseReady);

  useEffect(() => {
    processPlayerRef.current = { P1: processP1, P2: processP2 };
    processFrameRef.current = processFrame;
    poseReadyRef.current = poseReady;
  }, [processP1, processP2, processFrame, poseReady]);

  // Initialize game engine and PixiJS ticker game loop
  useEffect(() => {
    if (!app || !isReady) return;

    const engine = new FlapFlap2PEngine(app);
    engine.setCallbacks(handleGameStateChange, handleReadyChange);
    engineRef.current = engine;
    const FIXED_STEP_SECONDS = 1 / 60;
    const MAX_UPDATE_STEPS = 4;
    let accumulator = 0;
    let lastProcessedFrameSequence = -1;

    const ticker = app.ticker;
    const tickerCallback = (time: Ticker) => {
      const deltaTime = Math.min(time.deltaMS / 1000, 0.05);
      accumulator += deltaTime;

      let steps = 0;
      while (accumulator >= FIXED_STEP_SECONDS && steps < MAX_UPDATE_STEPS) {
        engineRef.current?.update(FIXED_STEP_SECONDS);
        accumulator -= FIXED_STEP_SECONDS;
        steps += 1;
      }

      const currentFrameSequence = frameSequenceRef.current;
      if (currentFrameSequence === lastProcessedFrameSequence) return;
      lastProcessedFrameSequence = currentFrameSequence;

      const playerPoses = assignPosesToPlayers(allLandmarksRef.current);
      presentRef.current = {
        P1: playerPoses.P1 !== null,
        P2: playerPoses.P2 !== null,
      };

      // Skip flap detection while the CV cursor's pointing pose is active —
      // moving the pointing hand would otherwise false-trigger a flap.
      if (cursorVisibleRef.current) return;
      if (playerPoses.P1) processPlayerRef.current.P1(playerPoses.P1);
      if (playerPoses.P2) processPlayerRef.current.P2(playerPoses.P2);
    };

    ticker.add(tickerCallback);

    return () => {
      ticker.remove(tickerCallback);
      engine.destroy();
      engineRef.current = null;
    };
  }, [
    app,
    isReady,
    allLandmarksRef,
    frameSequenceRef,
    handleGameStateChange,
    handleReadyChange,
    cursorVisibleRef,
  ]);

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

  // Mirror per-side presence into React state at a low rate for the camera panel.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const next = presentRef.current;
      setPresent((prev) =>
        prev.P1 === next.P1 && prev.P2 === next.P2 ? prev : next,
      );
    }, PRESENCE_POLL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video;
  }, []);

  // Keyboard fallback for testing: A = P1, L = P2
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyA") engineRef.current?.flap("P1");
      if (e.code === "KeyL") engineRef.current?.flap("P2");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    const compute = () => {
      const availW = el.clientWidth - 40;
      const availH = el.clientHeight - 56;
      const byW = (availW - 24 - 420) / FLAPFLAP_CONFIG.GAME_WIDTH;
      const byH = availH / FLAPFLAP_CONFIG.GAME_HEIGHT;
      setCanvasScale(Math.min(1, byW, byH));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const winnerColor =
    result && result !== "DRAW"
      ? FLAPFLAP_2P_CONFIG.PLAYERS[result].CSS_COLOR
      : "var(--color-cream)";

  return (
    <div ref={layoutRef} className="relative box-border flex h-screen w-full items-start justify-center overflow-hidden bg-games-gradient px-5 py-[28px]">
      <div className="flex w-full max-w-[1700px] items-start justify-center gap-6 max-[700px]:flex-col max-[700px]:items-center">
        <div
          className="relative shrink-0 overflow-hidden rounded-tag border-4 border-solid border-white/40 shadow-drop"
          style={{
            width: FLAPFLAP_CONFIG.GAME_WIDTH * canvasScale,
            height: FLAPFLAP_CONFIG.GAME_HEIGHT * canvasScale,
          }}
        >
          <div
            ref={containerRef}
            className="relative h-[900px] w-[1200px] origin-top-left"
            style={{ transform: `scale(${canvasScale})` }}
          >
            {gameState === "GAME_OVER" && result && (
              <div className={`absolute inset-0 z-[100] flex flex-col items-center justify-center gap-6 ${GAME_OVER_SCRIM}`}>
                <p className="m-0 font-jersey text-[120px] tracking-brand text-shadow-pop" style={{ color: winnerColor }}>
                  {result === "DRAW" ? "draw!" : `${result.toLowerCase()} wins!`}
                </p>
                <p className="m-0 font-averia text-body-xl text-white/80">pipes passed: {finalScore}</p>
                <button className={`mt-2 ${BTN_MD} ${BTN_PRIMARY}`} onClick={handlePlayAgain}>
                  play again
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-[420px] shrink-0 max-[700px]:w-[min(420px,100%)]">
          <SplitCameraPanel
            onVideoReady={handleVideoReady}
            present={present}
            ready={ready}
            showReady={gameState === "WAITING"}
          />
        </div>
      </div>

      <ExitButton onClick={onExit} />
    </div>
  );
};
