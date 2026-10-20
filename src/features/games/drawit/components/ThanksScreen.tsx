import React, { useEffect, useMemo } from "react";
import { PALETTE } from "../config/drawitConfig";
import otterImg from "../../../../assets/otter_default_rough_draft.png";

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
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden font-jersey">
      <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
        {pieces.map((p, i) => (
          <span
            key={i}
            className="absolute -top-10 block rounded-[2px] will-change-transform [animation-iteration-count:infinite] [animation-name:confetti-fall] [animation-timing-function:linear]"
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

      <img src={otterImg} alt="" className="pointer-events-none absolute right-10 -bottom-[100px] z-[3] h-auto w-[520px]" aria-hidden="true" />

      <div className="relative z-[2] flex flex-col items-center gap-5 text-center">
        <h1 className="m-0 text-[clamp(72px,12vw,100px)] tracking-brand text-white text-shadow-pop">go check out the gallery!👀</h1>
        <p className="m-0 text-[clamp(28px,3.5vw,44px)] tracking-brand text-lime text-shadow-pop">thanks!</p>
      </div>
    </div>
  );
};
