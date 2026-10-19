/**
 * Start Screen
 * Title, item legend and a hold-to-start ring. The round starts once a close
 * player holds up an open hand or a fist for START_HOLD_MS; that hand becomes
 * the locked player.
 */

import React, { useEffect, useRef, useState } from "react";
import { useCvCursorEnabled, type HandTrackSample } from "@/core/cv/cursor";
import { PinnedRegistrationQR } from "@/features/kiosk";
import waveImg from "../../../../assets/wave.png";
import { GUMBALL_SLICE_CONFIG as C } from "../config/gumballSliceConfig";
import { StartGate } from "../logic/StartGate";
import { ItemIcon } from "./ItemIcon";
import styles from "./StartScreen.module.css";

interface Props {
  onStart: (hand: HandTrackSample) => void;
  onBack: () => void;
}

type Hint = "raise" | "closer" | "hold";

const HINT_TEXT: Record<Hint, string> = {
  raise: "hold up your open hand or a fist",
  closer: "step closer to the screen",
  hold: "hold it... keep still!",
};

export const StartScreen: React.FC<Props> = ({ onStart, onBack }) => {
  const { handTrackRef } = useCvCursorEnabled();
  const ringRef = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState<Hint>("raise");

  useEffect(() => {
    const gate = new StartGate(C.START_HOLD_MS, C.START_DROPOUT_GRACE_MS, C.START_MIN_HAND_SCALE);
    let raf = 0;
    let lastHint: Hint = "raise";

    const tick = () => {
      const now = performance.now();
      const hand = handTrackRef.current;
      const fresh = hand.detected && now - hand.timestamp <= C.SAMPLE_STALE_MS;
      const progress = gate.update(fresh ? hand : null, now);
      ringRef.current?.style.setProperty("--progress", String(progress));

      const nextHint: Hint =
        progress > 0 ? "hold" : fresh && !hand.pointing && hand.handScale < C.START_MIN_HAND_SCALE ? "closer" : "raise";
      if (nextHint !== lastHint) {
        lastHint = nextHint;
        setHint(nextHint);
      }

      if (progress >= 1) {
        onStart({ ...hand });
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [handTrackRef, onStart]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Gumball Slice</h1>

      <div className={styles.legend}>
        <div className={styles.legendGroup}>
          <ItemIcon kind="gumball" size={88} />
          <ItemIcon kind="golden" size={88} />
          <span className={styles.good}>slice candy!</span>
        </div>
        <div className={styles.legendGroup}>
          <ItemIcon kind="broccoli" size={104} />
          <span className={styles.bad}>avoid broccoli</span>
        </div>
      </div>

      <div ref={ringRef} className={styles.ring}>
        <img src={waveImg} alt="" className={styles.hand} />
      </div>
      <p className={styles.hint}>{HINT_TEXT[hint]}</p>
      <p className={styles.subhint}>
        swipe your finger fast through the candy · {C.ROUND_SECONDS} seconds
      </p>

      <button className={styles.secondary} onClick={onBack}>
        Back
      </button>

      <PinnedRegistrationQR side="right" top={145} qrSize={150} />
    </div>
  );
};
