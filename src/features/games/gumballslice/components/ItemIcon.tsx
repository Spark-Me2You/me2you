/**
 * Item Icon
 * Small versions of the in-game items for the start-screen legend: SVG candy
 * matching candyArt.ts, and the same upright broccoli photo used in game.
 */

import React from "react";
import broccoliImg from "../../../../assets/Broccoli_PNG_Picture.png";
import { GUMBALL_SLICE_CONFIG as C } from "../config/gumballSliceConfig";

type IconKind = "gumball" | "golden" | "broccoli";

interface Props {
  kind: IconKind;
  className?: string;
}

export const ItemIcon: React.FC<Props> = ({ kind, className }) =>
  kind === "broccoli" ? (
    <img
      src={broccoliImg}
      alt=""
      aria-hidden="true"
      className={className}
      style={{ objectFit: "contain", transform: `rotate(${C.BROCCOLI_ROTATION_DEG}deg)` }}
    />
  ) : (
    <svg className={className} viewBox="-50 -50 100 100" aria-hidden="true">
      {kind === "gumball" && (
        <>
          <circle r="34" fill={C.CANDY_COLORS[0]} stroke={C.OUTLINE_GOOD} strokeWidth="4" />
          <ellipse cx="-11" cy="-13" rx="12" ry="7" fill={C.OUTLINE_GOOD} opacity="0.55" />
        </>
      )}
      {kind === "golden" && (
        <>
          <circle r="46" fill={C.GOLDEN_COLOR} opacity="0.25" />
          <circle r="34" fill={C.GOLDEN_COLOR} stroke={C.OUTLINE_GOOD} strokeWidth="4" />
          <polygon
            points="0,-12 4,-2 15,-2 6,5 9,16 0,9 -9,16 -6,5 -15,-2 -4,-2"
            fill={C.OUTLINE_GOOD}
          />
        </>
      )}
    </svg>
  );
