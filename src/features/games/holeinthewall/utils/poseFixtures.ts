/**
 * Test fixture: builds a synthetic front-facing body (square aspect) from a pose figure.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { PoseLandmark as L } from "@/shared/utils/gestureConstants";
import type { PoseFigure } from "../types/holeInTheWall";

const lm = (x: number, y: number, visibility = 1): NormalizedLandmark => ({
  x,
  y,
  z: 0,
  visibility,
});

const rad = (deg: number) => (deg * Math.PI) / 180;

/** The person's left side is on negative x, as in the mirrored display. */
export function bodyFromFigure(figure: PoseFigure): NormalizedLandmark[] {
  const out: NormalizedLandmark[] = [];
  const shoulderY = 0.25;
  const hipY = 0.55;
  const armLen = 0.2;
  const legLen = 0.3;

  out[L.NOSE] = lm(0.5, 0.15);
  out[L.LEFT_SHOULDER] = lm(0.45, shoulderY);
  out[L.RIGHT_SHOULDER] = lm(0.55, shoulderY);
  out[L.LEFT_HIP] = lm(0.46, hipY);
  out[L.RIGHT_HIP] = lm(0.54, hipY);

  const arm = (
    sx: number,
    side: -1 | 1,
    angle: number,
    elbow: number,
    wrist: number,
  ) => {
    const dx = side * Math.sin(rad(angle));
    const dy = Math.cos(rad(angle));
    out[elbow] = lm(sx + dx * armLen * 0.5, shoulderY + dy * armLen * 0.5);
    out[wrist] = lm(sx + dx * armLen, shoulderY + dy * armLen);
  };
  arm(0.45, -1, figure.leftArm, L.LEFT_ELBOW, L.LEFT_WRIST);
  arm(0.55, 1, figure.rightArm, L.RIGHT_ELBOW, L.RIGHT_WRIST);

  const leg = (
    hx: number,
    side: -1 | 1,
    knee: number,
    ankle: number,
  ) => {
    const dx = side * Math.sin(rad(figure.legSpread));
    const dy = Math.cos(rad(figure.legSpread));
    out[knee] = lm(hx + dx * legLen * 0.5, hipY + dy * legLen * 0.5);
    out[ankle] = lm(hx + dx * legLen, hipY + dy * legLen);
  };
  leg(0.46, -1, L.LEFT_KNEE, L.LEFT_ANKLE);
  leg(0.54, 1, L.RIGHT_KNEE, L.RIGHT_ANKLE);

  return out;
}
