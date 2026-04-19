import React, { useEffect, useMemo } from "react";
import { PALETTE } from "../config/drawitConfig";
import otterImg from "../../../../assets/otter_default_rough_draft.png";
import styles from "./ThanksScreen.module.css";

interface Props {
  onDone: () => void;
  /** Auto-advance delay in ms. Set to 0 to disable. */
  autoDismissMs?: number;
}

interface Piece {
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  drift: number;
  rotate: number;
}

const PIECE_COUNT = 80;

export const ThanksScreen: React.FC<Props> = ({ onDone, autoDismissMs = 6000 }) => {
  const pieces = useMemo<Piece[]>(() => {
    // Filter out white and near-white so confetti reads on white/light backgrounds.
    const colors = PALETTE.filter((c) => c !== "#FFFFFF");
    return Array.from({ length: PIECE_COUNT }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 3 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 8 + Math.random() * 10,
      drift: (Math.random() - 0.5) * 200,
      rotate: Math.random() * 720 - 360,
    }));
  }, []);

  useEffect(() => {
    if (!autoDismissMs) return;
    const t = setTimeout(onDone, autoDismissMs);
    return () => clearTimeout(t);
  }, [autoDismissMs, onDone]);

  return (
    <div className={styles.container}>
      <div className={styles.confetti} aria-hidden="true">
        {pieces.map((p, i) => (
          <span
            key={i}
            className={styles.piece}
            style={{
              left: `${p.left}%`,
              background: p.color,
              width: p.size,
              height: p.size * 1.4,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              ["--drift" as string]: `${p.drift}px`,
              ["--rotate" as string]: `${p.rotate}deg`,
            }}
          />
        ))}
      </div>

      <img src={otterImg} alt="" className={styles.otter} aria-hidden="true" />

      <div className={styles.content}>
        <h1 className={styles.title}>go check out the gallery!👀</h1>
        <p className={styles.subtitle}> thanks!</p>
      </div>
    </div>
  );
};
