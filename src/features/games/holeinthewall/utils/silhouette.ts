/**
 * Hole silhouettes: turns a pose figure into capsule shapes and rasterizes
 * them into horizontal runs, so the wall can be drawn as strips around the
 * holes without relying on overlapping boolean cuts.
 */

import type { PoseFigure } from "../types/holeInTheWall";

/** A line segment fattened by `r`. A zero-length segment is a disc. */
export interface Capsule {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  r: number;
}

/** Horizontal span [x0, x1) on one raster row. */
export type Interval = [number, number];

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Capsules for a body of height `h`, centered on x = 0 and vertically on y = 0.
 * The person's left side is on negative x, matching the mirrored display.
 */
export function figureShapes(figure: PoseFigure, h: number): Capsule[] {
  const top = -h / 2;
  const shoulderY = top + 0.2 * h;
  const hipY = top + 0.54 * h;
  const shoulderHalf = 0.075 * h;
  const hipHalf = 0.04 * h;
  const armLength = 0.31 * h;
  const legLength = 0.46 * h;

  const limb = (
    sx: number,
    sy: number,
    side: -1 | 1,
    angle: number,
    length: number,
    r: number,
  ): Capsule => ({
    ax: sx,
    ay: sy,
    bx: sx + side * Math.sin(rad(angle)) * length,
    by: sy + Math.cos(rad(angle)) * length,
    r,
  });

  return [
    { ax: 0, ay: top + 0.08 * h, bx: 0, by: top + 0.08 * h, r: 0.07 * h }, // head
    { ax: 0, ay: shoulderY + 0.02 * h, bx: 0, by: hipY, r: 0.1 * h }, // torso
    { ax: -shoulderHalf, ay: shoulderY, bx: shoulderHalf, by: shoulderY, r: 0.05 * h }, // shoulders
    limb(-shoulderHalf, shoulderY, -1, figure.leftArm, armLength, 0.05 * h),
    limb(shoulderHalf, shoulderY, 1, figure.rightArm, armLength, 0.05 * h),
    limb(-hipHalf, hipY, -1, figure.legSpread, legLength, 0.055 * h),
    limb(hipHalf, hipY, 1, figure.legSpread, legLength, 0.055 * h),
  ];
}

function insideCapsule(c: Capsule, x: number, y: number, grow: number) {
  const dx = c.bx - c.ax;
  const dy = c.by - c.ay;
  const lenSq = dx * dx + dy * dy;
  const t =
    lenSq === 0
      ? 0
      : Math.max(0, Math.min(1, ((x - c.ax) * dx + (y - c.ay) * dy) / lenSq));
  const px = c.ax + t * dx - x;
  const py = c.ay + t * dy - y;
  const r = c.r + grow;
  return px * px + py * py <= r * r;
}

/**
 * Spans on the row at `y` covered by the shapes (offset by `cx`, each radius
 * grown by `grow`), sampled every `cell` px across [xMin, xMax).
 */
export function rowIntervals(
  shapes: Capsule[],
  cx: number,
  y: number,
  grow: number,
  xMin: number,
  xMax: number,
  cell: number,
): Interval[] {
  const out: Interval[] = [];
  let start: number | null = null;

  for (let x = xMin; x < xMax; x += cell) {
    const inside = shapes.some((s) =>
      insideCapsule(s, x + cell / 2 - cx, y, grow),
    );
    if (inside && start === null) start = x;
    if (!inside && start !== null) {
      out.push([start, x]);
      start = null;
    }
  }
  if (start !== null) out.push([start, xMax]);
  return out;
}

/** `outer` minus `inner`, for sorted, non-overlapping interval lists. */
export function subtractIntervals(
  outer: Interval[],
  inner: Interval[],
): Interval[] {
  const out: Interval[] = [];
  for (const [o0, o1] of outer) {
    let cursor = o0;
    for (const [i0, i1] of inner) {
      if (i1 <= cursor || i0 >= o1) continue;
      if (i0 > cursor) out.push([cursor, i0]);
      cursor = Math.max(cursor, i1);
    }
    if (cursor < o1) out.push([cursor, o1]);
  }
  return out;
}
