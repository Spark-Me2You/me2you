/**
 * FlapFlap 4P Game Component
 * Up to four players share the camera (four strips) in one world; the last
 * bird standing wins.
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
import { FlapFlap4PEngine } from "../game/FlapFlap4PEngine";
import { FLAPFLAP_4P_CONFIG } from "../config/flapflap4pConfig";
import { assignPosesToPlayers } from "../utils/assignPlayers";
import type {
  FlapFlap4PState,
  FlapFlap4PResult,
  PlayerId,
} from "../types/flapflap4p";
import { useCvCursorEnabled } from "@/core/cv/cursor";
import { ExitButton } from "@/shared/components";
import type { GameProps } from "../../types/game";
import { SplitCameraPanel } from "./SplitCameraPanel";

const NOT_READY: Record<PlayerId, boolean> = {
  P1: false,
  P2: false,
  P3: false,
  P4: false,
};
const PLAYER_IDS: PlayerId[] = ["P1", "P2", "P3", "P4"];
const PRESENCE_POLL_MS = 250;

export const FlapFlap4PGame: React.FC<GameProps> = ({ onExit }) => {
  const { setEnabled: setCvCursorEnabled, cursorVisibleRef } =
    useCvCursorEnabled();

  const [gameState, setGameState] = useState<FlapFlap4PState>("WAITING");
  const [result, setResult] = useState<FlapFlap4PResult | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [ready, setReady] = useState<Record<PlayerId, boolean>>(NOT_READY);
  const [eliminated, setEliminated] =
    useState<Record<PlayerId, boolean>>(NOT_READY);
  const [present, setPresent] = useState<Record<PlayerId, boolean>>(NOT_READY);

  const { app, containerRef, isReady } = usePixiApp({
    width: FLAPFLAP_CONFIG.GAME_WIDTH,
    height: FLAPFLAP_CONFIG.GAME_HEIGHT,
    backgroundColor: FLAPFLAP_CONFIG.SKY_COLOR,
    resolution: Math.min(window.devicePixelRatio, 1.25),
  });

  const engineRef = useRef<FlapFlap4PEngine | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const presentRef = useRef<Record<PlayerId, boolean>>(NOT_READY);
  const [canvasScale, setCanvasScale] = useState(1);

  const {
    allLandmarksRef,
    frameSequenceRef,
    isInitialized: poseReady,
    processFrame,
  } = usePoseDetection({ numPoses: FLAPFLAP_4P_CONFIG.NUM_POSES });

  const handleGameStateChange = useCallback(
    (state: FlapFlap4PState) => {
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

  const handleEliminatedChange = useCallback(
    (nextEliminated: Record<PlayerId, boolean>) => {
      setTimeout(() => setEliminated(nextEliminated), 0);
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
  const handleFlapP3 = useCallback(() => engineRef.current?.flap("P3"), []);
  const handleFlapP4 = useCallback(() => engineRef.current?.flap("P4"), []);

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
  const { processLandmarks: processP3 } = useArmFlap({
    ...armFlapOptions,
    onFlap: handleFlapP3,
  });
  const { processLandmarks: processP4 } = useArmFlap({
    ...armFlapOptions,
    onFlap: handleFlapP4,
  });

  // Store callbacks in refs to prevent recreation
  const processPlayerRef = useRef({
    P1: processP1,
    P2: processP2,
    P3: processP3,
    P4: processP4,
  });
  const processFrameRef = useRef(processFrame);
  const poseReadyRef = useRef(poseReady);

  useEffect(() => {
    processPlayerRef.current = {
      P1: processP1,
      P2: processP2,
      P3: processP3,
      P4: processP4,
    };
    processFrameRef.current = processFrame;
    poseReadyRef.current = poseReady;
  }, [processP1, processP2, processP3, processP4, processFrame, poseReady]);

  // Initialize game engine and PixiJS ticker game loop
  useEffect(() => {
    if (!app || !isReady) return;

    const engine = new FlapFlap4PEngine(app);
    engine.setCallbacks(
      handleGameStateChange,
      handleReadyChange,
      handleEliminatedChange,
    );
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
      const nextPresent = {
        P1: playerPoses.P1 !== null,
        P2: playerPoses.P2 !== null,
        P3: playerPoses.P3 !== null,
        P4: playerPoses.P4 !== null,
      };
      presentRef.current = nextPresent;
      engineRef.current?.setPresent(nextPresent);

      // Skip flap detection while the CV cursor's pointing pose is active —
      // moving the pointing hand would otherwise false-trigger a flap.
      if (cursorVisibleRef.current) return;
      for (const id of PLAYER_IDS) {
        const landmarks = playerPoses[id];
        if (landmarks) processPlayerRef.current[id](landmarks);
      }
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
    handleEliminatedChange,
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

  // Mirror per-strip presence into React state at a low rate for the camera panel.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const next = presentRef.current;
      setPresent((prev) =>
        PLAYER_IDS.every((id) => prev[id] === next[id]) ? prev : next,
      );
    }, PRESENCE_POLL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video;
  }, []);

  // Keyboard fallback for testing: A = P1, S = P2, K = P3, L = P4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyA") engineRef.current?.flap("P1");
      if (e.code === "KeyS") engineRef.current?.flap("P2");
      if (e.code === "KeyK") engineRef.current?.flap("P3");
      if (e.code === "KeyL") engineRef.current?.flap("P4");
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
      ? FLAPFLAP_4P_CONFIG.PLAYERS[result].CSS_COLOR
      : "#ffffff";

  return (
    <div ref={layoutRef} className="relative box-border flex h-screen w-full items-start justify-center overflow-hidden bg-[linear-gradient(180deg,#1a1a2e_0%,#16213e_100%)] px-5 py-[28px]">
      <div className="flex w-full max-w-[1700px] items-start justify-center gap-6 max-[700px]:flex-col max-[700px]:items-center">
        <div
          className="relative shrink-0 overflow-hidden rounded-[16px] border-4 border-solid border-[rgba(255,255,255,0.3)] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
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
              <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-[rgba(10,10,20,0.88)] backdrop-blur-[6px]">
                <p className="m-0 font-jersey text-[120px] tracking-[4px] [text-shadow:0_0_24px_rgba(0,0,0,0.6)]" style={{ color: winnerColor }}>
                  {result === "DRAW" ? "Draw!" : `${result} wins!`}
                </p>
                <p className="m-0 font-jersey text-[36px] tracking-[2px] text-[rgba(255,255,255,0.7)]">pipes passed: {finalScore}</p>
                <button
                  className="mt-2 cursor-pointer rounded-[16px] border-[3px] border-solid border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.1)] px-12 py-4 font-jersey text-[36px] tracking-[4px] text-white backdrop-blur-[10px] transition-all duration-200 ease-[ease] hover:border-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.2)] hover:[transform:scale(1.05)]"
                  onClick={handlePlayAgain}
                >
                  PLAY AGAIN
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
            eliminated={eliminated}
            showReady={gameState === "WAITING"}
          />
        </div>
      </div>

      <ExitButton onClick={onExit} />
    </div>
  );
};
