import type { GestureCategory } from "../types/profileTypes";

/** One classified camera frame. `category` is null when no supported pose was seen. */
export interface PoseSample {
  category: GestureCategory | null;
  /** performance.now() when the frame was classified. */
  at: number;
}

/** A pose needs at least this many frames... */
const MIN_VOTES = 2;
/** ...and at least this share of all frames in the window, so stray frames don't win. */
const MIN_SHARE = 0.3;

/**
 * The pose seen most often among samples taken in [from, to], or null when
 * no pose was seen clearly enough.
 */
export function pickPose(samples: PoseSample[], from: number, to: number): GestureCategory | null {
  const inWindow = samples.filter((s) => s.at >= from && s.at <= to);
  if (inWindow.length === 0) return null;

  const counts = new Map<GestureCategory, number>();
  for (const { category } of inWindow) {
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  let best: GestureCategory | null = null;
  let bestCount = 0;
  for (const [category, count] of counts) {
    if (count > bestCount) {
      best = category;
      bestCount = count;
    }
  }

  if (bestCount < MIN_VOTES || bestCount / inWindow.length < MIN_SHARE) return null;
  return best;
}

const LABELS: Record<GestureCategory, string> = {
  wave: "wave",
  peace_sign: "peace sign",
  thumbs_up: "thumbs up",
};

export const poseLabel = (category: GestureCategory): string => LABELS[category];
