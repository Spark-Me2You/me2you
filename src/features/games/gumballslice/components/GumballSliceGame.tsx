/**
 * Gumball Slice Game Component
 * Full-screen PixiJS canvas driven by the shared index-fingertip tracking,
 * with React overlays for start / countdown / HUD / results.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Assets, type Texture } from "pixi.js";
import { useCvCursorEnabled } from "@/core/cv/cursor";
import { usePixiApp } from "../../hooks/usePixiApp";
import type { GameProps } from "../../types/game";
import { GUMBALL_SLICE_CONFIG } from "../config/gumballSliceConfig";
import type { ItemTextures } from "../game/candyArt";
import { GumballSliceEngine } from "../game/GumballSliceEngine";
import { BROCCOLI_IMAGE, CANDY_IMAGES, RAINBOW_IMAGE } from "../game/itemImages";
import { buildRoundResult } from "../logic/roundResult";
import { onRoundComplete } from "../services/roundCompleteService";
import type {
  HudSnapshot,
  RoundEndReason,
  RoundOutcome,
  RoundStats,
  ScreenState,
} from "../types/gumballSlice";
import { LoadErrorScreen, PlayerLostScreen, ResultsScreen } from "./ResultsScreen";
import { SliceCountdown } from "./SliceCountdown";
import { SliceHud } from "./SliceHud";
import { StartScreen } from "./StartScreen";

/*
 * Wooden table: vertical planks with seams, fine grain and a dark vignette
 * (keeps the bright slash trail and candy readable on top).
 */
const WOOD =
  "bg-[#7a4a26] [--plank:clamp(140px,14vw,220px)] bg-[image:radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.5)_100%),repeating-linear-gradient(90deg,transparent_0_calc(var(--plank)_-_5px),#2e1909_calc(var(--plank)_-_5px)_var(--plank)),repeating-linear-gradient(89deg,transparent_0_7px,rgba(78,44,20,0.35)_7px_9px,transparent_9px_23px,rgba(78,44,20,0.22)_23px_24px,transparent_24px_41px),repeating-linear-gradient(90deg,#7a4a26_0,#a0673a_calc(var(--plank)*0.3),#7a4a26_calc(var(--plank)*0.55),#4e2c14_calc(var(--plank)*0.85),#7a4a26_var(--plank))]";

const INITIAL_HUD: HudSnapshot = {
  score: 0,
  secondsLeft: GUMBALL_SLICE_CONFIG.ROUND_SECONDS,
  slicedCount: 0,
  broccoliHits: 0,
  comboCount: 0,
  playerMissing: false,
};

export const GumballSliceGame: React.FC<GameProps> = ({ onExit }) => {
  const { handTrackRef, setCursorVariant } = useCvCursorEnabled();
  const [screen, setScreen] = useState<ScreenState>("START");
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const [size] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [textures, setTextures] = useState<ItemTextures | null>(null);
  const [textureError, setTextureError] = useState(false);
  const engineRef = useRef<GumballSliceEngine | null>(null);
  const sessionRef = useRef("");

  const { app, containerRef, isReady, error: pixiError } = usePixiApp({
    width: size.width,
    height: size.height,
    backgroundAlpha: 0,
    resolution: Math.min(window.devicePixelRatio, 1.25),
  });

  const handleRoundEnd = useCallback((stats: RoundStats, reason: RoundEndReason) => {
    if (reason === "PLAYER_LOST") {
      // Abandoned round: the score is discarded and never reported.
      setScreen("LOST");
      return;
    }
    const roundResult = buildRoundResult(stats, sessionRef.current, reason === "TIME_UP", {
      minSlices: GUMBALL_SLICE_CONFIG.MIN_SLICES,
      maxBroccoliHits: GUMBALL_SLICE_CONFIG.MAX_BROCCOLI_HITS,
    });
    setOutcome(onRoundComplete(roundResult));
    setScreen("RESULTS");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const urls = [BROCCOLI_IMAGE, RAINBOW_IMAGE.url, ...CANDY_IMAGES.map((c) => c.url)];
    Assets.load<Texture>(urls)
      .then((loaded) => {
        if (cancelled) return;
        setTextures({
          broccoli: loaded[BROCCOLI_IMAGE],
          rainbow: { texture: loaded[RAINBOW_IMAGE.url], particleColor: RAINBOW_IMAGE.particleColor },
          candies: CANDY_IMAGES.map((c) => ({ texture: loaded[c.url], particleColor: c.particleColor })),
        });
      })
      .catch((err) => {
        console.error("Gumball Slice: failed to load textures", err);
        if (!cancelled) setTextureError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!app || !isReady || !textures) return;

    // Engine callbacks fire inside the Pixi ticker (RAF); defer React updates
    // out of it, as FlapFlap does.
    const engine = new GumballSliceEngine(app, () => handTrackRef.current, {
      onHud: (next) => setTimeout(() => setHud(next), 0),
      onRoundEnd: (stats, reason) => setTimeout(() => handleRoundEnd(stats, reason), 0),
    }, textures);
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [app, isReady, textures, handTrackRef, handleRoundEnd]);

  // Trail + fingertip dot replace the global cursor while slicing; the normal
  // cursor comes back for the start / results buttons.
  useEffect(() => {
    const slicing = screen === "COUNTDOWN" || screen === "PLAYING";
    engineRef.current?.setTrailVisible(slicing);
    setCursorVariant(slicing ? "hidden" : "default");
  }, [screen, isReady, textures, setCursorVariant]);

  useEffect(() => () => setCursorVariant("default"), [setCursorVariant]);

  const handleReady = useCallback(() => {
    // Lock onto the hand that just tapped Ready (if it's still in view).
    const hand = handTrackRef.current;
    const fresh =
      hand.detected &&
      performance.now() - hand.timestamp <= GUMBALL_SLICE_CONFIG.SAMPLE_STALE_MS;
    engineRef.current?.lockPlayer(fresh ? { ...hand } : null);
    sessionRef.current = crypto.randomUUID();
    setScreen("COUNTDOWN");
  }, [handTrackRef]);

  const handleCountdownDone = useCallback(() => {
    engineRef.current?.startRound();
    setScreen("PLAYING");
  }, []);

  const handlePlayAgain = useCallback(() => {
    engineRef.current?.reset();
    setOutcome(null);
    setScreen("START");
  }, []);

  const loadFailed = textureError || pixiError !== null;

  return (
    <div className={`fixed inset-0 overflow-hidden ${WOOD}`}>
      <div ref={containerRef} className="absolute inset-0" />

      {loadFailed && <LoadErrorScreen onMenu={onExit} />}

      {!loadFailed && screen === "START" && (
        <StartScreen ready={isReady && textures !== null} onReady={handleReady} onBack={onExit} />
      )}

      {screen === "COUNTDOWN" && <SliceCountdown onDone={handleCountdownDone} />}

      {(screen === "PLAYING" || screen === "RESULTS") && <SliceHud hud={hud} />}

      {screen === "RESULTS" && outcome && (
        <ResultsScreen outcome={outcome} onPlayAgain={handlePlayAgain} onMenu={onExit} />
      )}

      {screen === "LOST" && <PlayerLostScreen onPlayAgain={handlePlayAgain} onMenu={onExit} />}
    </div>
  );
};
