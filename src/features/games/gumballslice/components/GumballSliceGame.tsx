/**
 * Gumball Slice Game Component
 * Full-screen PixiJS canvas driven by the shared index-fingertip tracking,
 * with React overlays for start / countdown / HUD / results.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Assets, type Texture } from "pixi.js";
import broccoliImg from "../../../../assets/Broccoli_PNG_Picture.png";
import { useCvCursorEnabled } from "@/core/cv/cursor";
import { usePixiApp } from "../../hooks/usePixiApp";
import type { GameProps } from "../../types/game";
import { GUMBALL_SLICE_CONFIG, GUMBALL_SLICE_CSS_VARS } from "../config/gumballSliceConfig";
import { GumballSliceEngine } from "../game/GumballSliceEngine";
import { buildRoundResult } from "../logic/roundResult";
import { onRoundComplete } from "../services/roundCompleteService";
import type {
  HudSnapshot,
  RoundEndReason,
  RoundResult,
  RoundStats,
  ScreenState,
} from "../types/gumballSlice";
import { PlayerLostScreen, ResultsScreen } from "./ResultsScreen";
import { SliceCountdown } from "./SliceCountdown";
import { SliceHud } from "./SliceHud";
import { StartScreen } from "./StartScreen";
import styles from "./GumballSliceGame.module.css";

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
  const [result, setResult] = useState<RoundResult | null>(null);
  const [size] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [broccoliTexture, setBroccoliTexture] = useState<Texture | null>(null);
  const engineRef = useRef<GumballSliceEngine | null>(null);
  const sessionRef = useRef("");

  const { app, containerRef, isReady } = usePixiApp({
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
    setResult(onRoundComplete(roundResult));
    setScreen("RESULTS");
  }, []);

  useEffect(() => {
    let cancelled = false;
    Assets.load<Texture>(broccoliImg).then((texture) => {
      if (!cancelled) setBroccoliTexture(texture);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!app || !isReady || !broccoliTexture) return;

    // Engine callbacks fire inside the Pixi ticker (RAF); defer React updates
    // out of it, as FlapFlap does.
    const engine = new GumballSliceEngine(app, () => handTrackRef.current, {
      onHud: (next) => setTimeout(() => setHud(next), 0),
      onRoundEnd: (stats, reason) => setTimeout(() => handleRoundEnd(stats, reason), 0),
    }, broccoliTexture);
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [app, isReady, broccoliTexture, handTrackRef, handleRoundEnd]);

  // Trail + fingertip dot replace the global cursor while slicing; the normal
  // cursor comes back for the start / results buttons.
  useEffect(() => {
    const slicing = screen === "COUNTDOWN" || screen === "PLAYING";
    engineRef.current?.setTrailVisible(slicing);
    setCursorVariant(slicing ? "hidden" : "default");
  }, [screen, isReady, broccoliTexture, setCursorVariant]);

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
    setResult(null);
    setScreen("START");
  }, []);

  return (
    <div className={`${styles.container} ${styles.wood}`} style={GUMBALL_SLICE_CSS_VARS}>
      <div ref={containerRef} className={styles.canvas} />

      {screen === "START" && <StartScreen onReady={handleReady} onBack={onExit} />}

      {screen === "COUNTDOWN" && <SliceCountdown onDone={handleCountdownDone} />}

      {(screen === "PLAYING" || screen === "RESULTS") && <SliceHud hud={hud} />}

      {screen === "RESULTS" && result && (
        <ResultsScreen result={result} onPlayAgain={handlePlayAgain} onMenu={onExit} />
      )}

      {screen === "LOST" && <PlayerLostScreen onPlayAgain={handlePlayAgain} onMenu={onExit} />}
    </div>
  );
};
