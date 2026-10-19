/**
 * Item Icon
 * Small SVG versions of the in-game items for the start-screen legend.
 * Same shapes and theme colours as candyArt.ts.
 */

import React from "react";
import { GUMBALL_SLICE_CONFIG as C } from "../config/gumballSliceConfig";

type IconKind = "gumball" | "golden" | "broccoli" | "lemon";

interface Props {
  kind: IconKind;
  size: number;
}

export const ItemIcon: React.FC<Props> = ({ kind, size }) => (
  <svg width={size} height={size} viewBox="-50 -50 100 100" aria-hidden="true">
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
    {kind === "broccoli" && (
      <g stroke={C.OUTLINE_BAD} strokeWidth="4">
        <polygon points="-10,0 10,0 13,36 -13,36" fill={C.BROCCOLI_SHADE_COLOR} />
        <circle cx="-21" cy="-2" r="15" fill={C.BROCCOLI_COLOR} />
        <circle cx="21" cy="-2" r="15" fill={C.BROCCOLI_COLOR} />
        <circle cx="-10" cy="-17" r="17" fill={C.BROCCOLI_COLOR} />
        <circle cx="10" cy="-17" r="17" fill={C.BROCCOLI_COLOR} />
        <circle cx="0" cy="-4" r="17" fill={C.BROCCOLI_COLOR} />
      </g>
    )}
    {kind === "lemon" && (
      <g stroke={C.OUTLINE_BAD} strokeWidth="4" strokeLinecap="round">
        <polygon points="-34,-7 -46,0 -34,7" fill={C.LEMON_COLOR} />
        <polygon points="34,-7 46,0 34,7" fill={C.LEMON_COLOR} />
        <ellipse rx="37" ry="27" fill={C.LEMON_COLOR} />
        <path d="M-21,-10 L-10,-6 M21,-10 L10,-6 M-14,10 Q-7,4 0,10 Q7,16 14,10" fill="none" />
      </g>
    )}
  </svg>
);
