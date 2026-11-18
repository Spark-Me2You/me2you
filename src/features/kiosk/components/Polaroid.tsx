/**
 * Taped polaroid (brand book §5 motif): cream card, pink tape strip on top,
 * thicker bottom edge. Used by the "that's you!" camera preview and the
 * mouse-tutorial GIF on the idle-screen corkboard.
 */

import type { HTMLAttributes, ReactNode } from "react";

// No position utility here: callers pin it (fixed / absolute), which also
// anchors the tape.
const CARD =
  "flex flex-col items-center gap-2 rounded-[4px] bg-polaroid px-3 pt-3 shadow-note select-none";
const TAPE =
  "absolute -top-[11px] left-1/2 h-[22px] w-[90px] -translate-x-1/2 rotate-[4deg] bg-tape/80 shadow-tape";
const CAPTION = "m-0 font-averia text-body-md leading-none tracking-brand text-ink lowercase";

interface PolaroidProps extends HTMLAttributes<HTMLDivElement> {
  /** Handwritten-style label under the photo. Without one, the bottom edge keeps its height. */
  caption?: ReactNode;
  /** Position (must be fixed, absolute or relative), size and tilt. */
  className?: string;
  children: ReactNode;
}

export const Polaroid: React.FC<PolaroidProps> = ({ caption, className = "", children, ...rest }) => (
  <div className={`${CARD} ${caption ? "pb-2" : "pb-[34px]"} ${className}`} {...rest}>
    <div className={TAPE} aria-hidden="true" />
    {children}
    {caption && <p className={CAPTION}>{caption}</p>}
  </div>
);
