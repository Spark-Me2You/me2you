/**
 * Slice Demo
 * Looping animation of a slash cutting a candy in two, showing how to play.
 */

import React from "react";
import { ICON_CANDY_IMAGE } from "../game/itemImages";

const CANDY =
  "absolute top-1/2 left-1/2 mt-[calc(var(--size)/-2)] ml-[calc(var(--size)/-2)] size-[var(--size)] bg-contain bg-center bg-no-repeat";
const candyImage = { backgroundImage: `url(${ICON_CANDY_IMAGE})` };

export const SliceDemo: React.FC = () => (
  <div className="relative h-[calc(var(--size)*1.6)] w-[calc(var(--size)*3.2)] shrink-0 [--size:clamp(64px,11vh,120px)]" aria-hidden="true">
    <div className={`${CANDY} animate-gs-split-left [clip-path:inset(0_50%_0_0)]`} style={candyImage} />
    <div className={`${CANDY} animate-gs-split-right [clip-path:inset(0_0_0_50%)]`} style={candyImage} />
    <div className="animate-gs-slash absolute top-1/2 left-1/2 mt-[calc(var(--size)*-0.065)] ml-[calc(var(--size)*-1)] h-[calc(var(--size)*0.13)] w-[calc(var(--size)*2)] rounded-full bg-[linear-gradient(90deg,transparent,var(--color-sky)_60%,#fff)] shadow-[0_0_18px_var(--color-sky)]" />
  </div>
);
