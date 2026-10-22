/**
 * Item Icon
 * Start-screen legend icon: the same candy / upright broccoli images used in game.
 */

import React from "react";
import { GUMBALL_SLICE_CONFIG as C } from "../config/gumballSliceConfig";
import { BROCCOLI_IMAGE, ICON_CANDY_IMAGE } from "../game/itemImages";

interface Props {
  kind: "candy" | "broccoli";
  className?: string;
}

export const ItemIcon: React.FC<Props> = ({ kind, className }) => (
  <img
    src={kind === "candy" ? ICON_CANDY_IMAGE : BROCCOLI_IMAGE}
    alt=""
    aria-hidden="true"
    className={className}
    style={{
      objectFit: "contain",
      transform: kind === "broccoli" ? `rotate(${C.BROCCOLI_ROTATION_DEG}deg)` : undefined,
    }}
  />
);
