/**
 * Slice geometry
 * Swept hit test: a fingertip moving from A to B between two tracking samples
 * slices every circle the SEGMENT touches, so fast swipes can't tunnel
 * through a candy that sat between the two sampled points.
 */

/** True if segment (ax,ay)→(bx,by) passes within `radius` of (cx,cy). */
export function segmentHitsCircle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  radius: number,
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;

  // Project the centre onto the segment and clamp to its ends.
  let t = lengthSq > 0 ? ((cx - ax) * dx + (cy - ay) * dy) / lengthSq : 0;
  t = Math.max(0, Math.min(1, t));

  const px = ax + t * dx - cx;
  const py = ay + t * dy - cy;
  return px * px + py * py <= radius * radius;
}

/** Fingertip speed over a segment, in screen heights per second. */
export function segmentSpeed(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  dtMs: number,
  screenHeight: number,
): number {
  if (dtMs <= 0 || screenHeight <= 0) return 0;
  return Math.hypot(bx - ax, by - ay) / screenHeight / (dtMs / 1000);
}
