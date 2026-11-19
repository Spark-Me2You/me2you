/**
 * Where garments hang on the clothesline wall. A spot is a rope index plus a position along
 * that rope as a share of its width, so it doesn't depend on the stage scale.
 * Pure functions: unit-tested directly.
 */

export interface LineSpot {
  rope: number;
  /** 0 = left end of the rope, 1 = right end. */
  x: number;
}

/** Closest a garment's centre may get to either end of a rope. */
export const ROPE_END_MARGIN = 0.04;

/** Number of ropes for this many garments (an empty line still shows one). */
export function ropeCount(garments: number, perRope: number): number {
  return Math.max(1, Math.ceil(garments / perRope));
}

/** The resting spot of the garment at `index`: ropes fill in order, evenly spaced. */
export function defaultSpot(index: number, total: number, perRope: number): LineSpot {
  const rope = Math.floor(index / perRope);
  const onRope = Math.min(perRope, total - rope * perRope);
  return { rope, x: ((index % perRope) + 0.5) / onRope };
}

export function clampX(x: number): number {
  return Math.min(1 - ROPE_END_MARGIN, Math.max(ROPE_END_MARGIN, x));
}

/** A rope's on-screen box, as from getBoundingClientRect. */
export interface RopeBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The spot under a pointer: the rope whose middle is nearest vertically, then along it. */
export function spotAt(clientX: number, clientY: number, ropes: RopeBox[]): LineSpot | null {
  let best: LineSpot | null = null;
  let bestDistance = Infinity;
  ropes.forEach((box, rope) => {
    const distance = Math.abs(clientY - (box.top + box.height / 2));
    if (distance < bestDistance && box.width > 0) {
      bestDistance = distance;
      best = { rope, x: clampX((clientX - box.left) / box.width) };
    }
  });
  return best;
}
