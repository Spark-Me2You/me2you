/**
 * Hole in the Wall Game Component
 * Two players share the camera (split down the middle). A wall with a
 * pose-shaped hole per player approaches; each player's skeleton is drawn over
 * the mirrored feed and judged against the pose as the wall arrives.
 */

import React, { useRef, useEffect, useCallback, useMemo, useState } from "react";
import type { Ticker } from "pixi.js";
import { usePixiApp } from "../../hooks/usePixiApp";
import {
  usePoseDetection,
  POSE_PROCESS_INTERVAL_MS,
} from "../../hooks/usePoseDetection";
import { useCamera } from "@/features/discovery/hooks/useCamera";
import { useCvCursorEnabled } from "@/core/cv/cursor";
import { ExitButton } from "@/shared/components";
import type { GameProps } from "../../types/game";
import { BTN_MD, BTN_PRIMARY, GAME_OVER_SCRIM } from "../../components/gameUi";
import { HOLE_IN_THE_WALL_CONFIG as CONFIG } from "../config/holeInTheWallConfig";
import {
  HoleInTheWallEngine,
  type PlayerInputs,
} from "../game/HoleInTheWallEngine";
import { HoleInTheWallScene } from "../game/HoleInTheWallScene";
import { assignPosesToPlayers, type PlayerPoses } from "../utils/assignPlayers";
import { matchPose } from "../utils/poseMatch";
import { T_POSE } from "../utils/poses";
import type {
  HoleInTheWallResult,
  HoleInTheWallState,
  PlayerId,
} from "../types/holeInTheWall";

const PLAYERS: PlayerId[] = ["P1", "P2"];
const NO_POSES: PlayerPoses = { P1: null, P2: null };
const NO_FLAGS: Record<PlayerId, boolean> = { P1: false, P2: false };
const HUD_POLL_MS = 100;

/** The pose both players are aiming for (single pose for now). */
const CURRENT_POSE = T_POSE;

interface Hud {
  state: HoleInTheWallState;
  lives: Record<PlayerId, number>;
  passed: Record<PlayerId, number>;
  countdown: number;
  present: Record<PlayerId, boolean>;
  matched: Record<PlayerId, boolean>;
}

const INITIAL_HUD: Hud = {
  state: "WAITING",
  lives: { P1: CONFIG.LIVES, P2: CONFIG.LIVES },
  passed: { P1: 0, P2: 0 },
  countdown: 0,
  present: NO_FLAGS,
  matched: NO_FLAGS,
};

const hudKey = (h: Hud) => JSON.stringify(h);

export const HoleInTheWallGame: React.FC<GameProps> = ({ onExit }) => {
  const { setEnabled: setCvCursorEnabled } = useCvCursorEnabled();

  const [gameState, setGameState] = useState<HoleInTheWallState>("WAITING");
  const [result, setResult] = useState<HoleInTheWallResult | null>(null);
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [canvasScale, setCanvasScale] = useState(1);

  const { app, containerRef, isReady } = usePixiApp({
    width: CONFIG.GAME_WIDTH,
    height: CONFIG.GAME_HEIGHT,
    backgroundAlpha: 0,
    resolution: Math.min(window.devicePixelRatio, 1.25),
  });

  const engineRef = useRef<HoleInTheWallEngine | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const posesRef = useRef<PlayerPoses>(NO_POSES);
  const matchedRef = useRef<Record<PlayerId, boolean>>(NO_FLAGS);

  const {
    allLandmarksRef,
    frameSequenceRef,
    isInitialized: poseReady,
    error: poseError,
    processFrame,
  } = usePoseDetection({ numPoses: CONFIG.NUM_POSES });

  const processFrameRef = useRef(processFrame);
  const poseReadyRef = useRef(poseReady);
  useEffect(() => {
    processFrameRef.current = processFrame;
    poseReadyRef.current = poseReady;
  }, [processFrame, poseReady]);

  const cameraOptions = useMemo(
    () => ({
      videoConstraints: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30, max: 30 },
        facingMode: "user" as const,
      },
    }),
    [],
  );
  const { stream, isLoading, error: cameraError } = useCamera(cameraOptions);

  const attachVideo = useCallback(
    (video: HTMLVideoElement | null) => {
      if (!video) return;
      if (stream && video.srcObject !== stream) video.srcObject = stream;
      videoRef.current = video;
    },
    [stream],
  );

  const handleStateChange = useCallback(
    (state: HoleInTheWallState) => {
      // Defer React state updates out of the PixiJS RAF callback context
      // (see FlapFlapGame for why).
      setTimeout(() => {
        setCvCursorEnabled(state !== "PLAYING" && state !== "COUNTDOWN");
        if (state === "GAME_OVER") {
          setResult(engineRef.current?.getResult() ?? null);
        }
        setGameState(state);
      }, 0);
    },
    [setCvCursorEnabled],
  );

  const handlePlayAgain = useCallback(() => {
    engineRef.current?.restart();
    setResult(null);
  }, []);

  // Engine + scene + PixiJS ticker game loop
  useEffect(() => {
    if (!app || !isReady) return;

    const engine = new HoleInTheWallEngine();
    engine.setCallbacks(handleStateChange);
    const scene = new HoleInTheWallScene(app);
    engineRef.current = engine;

    let lastSequence = -1;
    let inputs: PlayerInputs = {
      P1: { present: false, matched: false },
      P2: { present: false, matched: false },
    };

    const tickerCallback = (time: Ticker) => {
      const dt = Math.min(time.deltaMS / 1000, 0.05);

      // Re-run pose assignment/matching only when a new CV frame has landed.
      const sequence = frameSequenceRef.current;
      if (sequence !== lastSequence) {
        lastSequence = sequence;
        const poses = assignPosesToPlayers(allLandmarksRef.current);
        posesRef.current = poses;

        const matched = { P1: false, P2: false };
        for (const p of PLAYERS) {
          matched[p] = matchPose(poses[p], CURRENT_POSE).matched;
        }
        matchedRef.current = matched;
        inputs = {
          P1: { present: poses.P1 !== null, matched: matched.P1 },
          P2: { present: poses.P2 !== null, matched: matched.P2 },
        };
      }

      engine.update(dt, inputs);
      scene.render(engine.getWall(), posesRef.current, matchedRef.current);
    };

    app.ticker.add(tickerCallback);

    return () => {
      app.ticker.remove(tickerCallback);
      scene.destroy();
      engineRef.current = null;
    };
  }, [app, isReady, allLandmarksRef, frameSequenceRef, handleStateChange]);

  // Run CV inference on its own cadence, separate from the render ticker.
  useEffect(() => {
    if (!poseReady) return;
    const id = window.setInterval(() => {
      if (!videoRef.current || !poseReadyRef.current) return;
      processFrameRef.current(videoRef.current, performance.now());
    }, POSE_PROCESS_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [poseReady]);

  // Mirror engine state into React at a low rate for the HUD.
  useEffect(() => {
    const id = window.setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;
      const poses = posesRef.current;
      const next: Hud = {
        state: engine.getState(),
        lives: engine.getLives(),
        passed: engine.getPassed(),
        countdown: engine.getCountdownSeconds(),
        present: { P1: poses.P1 !== null, P2: poses.P2 !== null },
        matched: { ...matchedRef.current },
      };
      setHud((prev) => (hudKey(prev) === hudKey(next) ? prev : next));
    }, HUD_POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    const compute = () => {
      const byW = (el.clientWidth - 40) / CONFIG.GAME_WIDTH;
      const byH = (el.clientHeight - 56) / CONFIG.GAME_HEIGHT;
      setCanvasScale(Math.min(1, byW, byH));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const playerStatus = (id: PlayerId): string => {
    if (!hud.present[id]) return "step in";
    if (gameState === "PLAYING") return hud.matched[id] ? "hold it!" : CURRENT_POSE.label;
    return "ready";
  };

  const winnerColor =
    result && result !== "DRAW"
      ? CONFIG.PLAYERS[result].CSS_COLOR
      : "var(--color-cream)";

  const cameraStatus = cameraError
    ? "camera unavailable"
    : poseError
      ? "pose detection unavailable"
      : isLoading || !poseReady
        ? "loading..."
        : null;

  return (
    <div ref={layoutRef} className="relative box-border flex h-screen w-full items-start justify-center overflow-hidden bg-games-gradient px-5 py-[28px]">
      <div
        className="relative shrink-0 overflow-hidden rounded-tag border-4 border-solid border-white/40 bg-ink shadow-drop"
        style={{
          width: CONFIG.GAME_WIDTH * canvasScale,
          height: CONFIG.GAME_HEIGHT * canvasScale,
        }}
      >
        <video
          ref={attachVideo}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full -scale-x-100 object-cover [backface-visibility:hidden]"
        />

        {/* Pixi draws into this div; keep it free of React children. */}
        <div
          ref={containerRef}
          className="absolute top-0 left-0 h-[900px] w-[1200px] origin-top-left"
          style={{ transform: `scale(${canvasScale})` }}
        />

        <div className="absolute top-0 bottom-0 left-1/2 w-1 -translate-x-1/2 bg-white/60" />

        {PLAYERS.map((id) => {
          const color = CONFIG.PLAYERS[id].CSS_COLOR;
          return (
            <div
              key={id}
              className={`pointer-events-none absolute top-0 bottom-0 flex w-1/2 flex-col items-center justify-between py-3 ${id === "P1" ? "left-0" : "right-0"}`}
            >
              <div className="flex flex-col items-center gap-1 [text-shadow:0_0_4px_#000,0_0_8px_#000]">
                <span className="font-jersey text-[48px] leading-none tracking-brand" style={{ color }}>
                  {id.toLowerCase()}
                </span>
                <span className="font-jersey text-[32px] leading-none tracking-brand" style={{ color }}>
                  {"♥".repeat(Math.max(0, hud.lives[id]))}
                </span>
                <span className="font-averia text-body-lg text-white">walls: {hud.passed[id]}</span>
              </div>
              <span className="font-jersey text-[40px] leading-none tracking-brand text-white [text-shadow:0_0_4px_#000,0_0_8px_#000]">
                {playerStatus(id)}
              </span>
            </div>
          );
        })}

        {gameState === "COUNTDOWN" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="font-jersey text-[240px] leading-none text-white text-shadow-pop">{hud.countdown}</span>
          </div>
        )}

        {gameState === "WAITING" && !cameraStatus && (
          <div className="pointer-events-none absolute inset-x-0 top-[45%] flex justify-center">
            <p className="m-0 font-jersey text-[56px] tracking-brand text-white [text-shadow:0_0_4px_#000,0_0_8px_#000]">
              both players step in & strike a {CURRENT_POSE.label}
            </p>
          </div>
        )}

        {cameraStatus && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/70 font-averia text-body-xl text-white">
            {cameraStatus}
          </div>
        )}

        {gameState === "GAME_OVER" && result && (
          <div className={`absolute inset-0 z-[100] flex flex-col items-center justify-center gap-6 ${GAME_OVER_SCRIM}`}>
            <p className="m-0 font-jersey text-[120px] tracking-brand text-shadow-pop" style={{ color: winnerColor }}>
              {result === "DRAW" ? "draw!" : `${result.toLowerCase()} wins!`}
            </p>
            <p className="m-0 font-averia text-body-xl text-white/80">
              walls cleared — p1: {hud.passed.P1} · p2: {hud.passed.P2}
            </p>
            <button className={`mt-2 ${BTN_MD} ${BTN_PRIMARY}`} onClick={handlePlayAgain}>
              play again
            </button>
          </div>
        )}
      </div>

      <ExitButton onClick={onExit} />
    </div>
  );
};
