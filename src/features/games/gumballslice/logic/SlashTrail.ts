/**
 * Slash Trail
 * Ring buffer of recent fingertip samples. Points fade by AGE (not by count),
 * so the ribbon looks the same at any tracking or display frame rate.
 *
 * Smoothing never moves the newest point: the head is always the latest raw
 * fingertip, and each older point is relaxed toward the midpoint of its
 * neighbours once its successor arrives. That removes jitter without lag.
 */

export interface TrailPoint {
  x: number;
  y: number;
  t: number; // ms (performance.now clock)
  stroke: number; // points with different stroke ids are never joined
}

/** 1 at the head, falling linearly to 0 at `lifetimeMs`. */
export function trailFade(ageMs: number, lifetimeMs: number): number {
  if (lifetimeMs <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - ageMs / lifetimeMs));
}

export class SlashTrail {
  private readonly points: TrailPoint[];
  private readonly alive: TrailPoint[] = [];
  private start = 0; // index of the oldest point
  private size = 0;
  private stroke = 0;
  private readonly lifetimeMs: number;
  private readonly smoothing: number;

  constructor(capacity: number, lifetimeMs: number, smoothing: number) {
    this.points = Array.from({ length: capacity }, () => ({ x: 0, y: 0, t: 0, stroke: 0 }));
    this.lifetimeMs = lifetimeMs;
    this.smoothing = Math.max(0, Math.min(1, smoothing));
  }

  /** Append a raw fingertip sample; `newStroke` breaks the line (tracking was lost). */
  push(x: number, y: number, t: number, newStroke: boolean): void {
    if (newStroke) this.stroke += 1;

    const capacity = this.points.length;
    if (this.size === capacity) {
      this.start = (this.start + 1) % capacity;
      this.size -= 1;
    }
    const slot = this.points[(this.start + this.size) % capacity];
    slot.x = x;
    slot.y = y;
    slot.t = t;
    slot.stroke = this.stroke;
    this.size += 1;

    this.relaxPrevious();
  }

  /**
   * Points still within the lifetime, oldest → newest. Returns a reused array
   * (valid until the next call) so per-frame rendering allocates nothing.
   */
  getAlive(now: number): readonly TrailPoint[] {
    const capacity = this.points.length;
    while (this.size > 0 && now - this.points[this.start].t >= this.lifetimeMs) {
      this.start = (this.start + 1) % capacity;
      this.size -= 1;
    }

    this.alive.length = 0;
    for (let i = 0; i < this.size; i++) {
      this.alive.push(this.points[(this.start + i) % capacity]);
    }
    return this.alive;
  }

  /** Fade factor for a point at time `t`. */
  fadeAt(t: number, now: number): number {
    return trailFade(now - t, this.lifetimeMs);
  }

  clear(): void {
    this.start = 0;
    this.size = 0;
  }

  private relaxPrevious(): void {
    if (this.smoothing === 0 || this.size < 3) return;
    const capacity = this.points.length;
    const next = this.points[(this.start + this.size - 1) % capacity];
    const mid = this.points[(this.start + this.size - 2) % capacity];
    const prev = this.points[(this.start + this.size - 3) % capacity];
    if (prev.stroke !== mid.stroke || mid.stroke !== next.stroke) return;

    const k = this.smoothing * 0.5;
    mid.x += ((prev.x + next.x) / 2 - mid.x) * k;
    mid.y += ((prev.y + next.y) / 2 - mid.y) * k;
  }
}
