/**
 * Combo Tracker
 * Groups slices into swipes. A swipe is one continuous fast stroke: it starts
 * with the first fast sample and ends once the fingertip has stayed below the
 * slice speed for `endAfterMs` (or tracking is lost for that long).
 */

export class ComboTracker {
  private inSwipe = false;
  private slowSince: number | null = null;
  private count = 0;
  private readonly endAfterMs: number;

  constructor(endAfterMs: number) {
    this.endAfterMs = endAfterMs;
  }

  /** Slices so far in the current swipe. */
  get current(): number {
    return this.count;
  }

  /**
   * Feed one fingertip sample (or `fast = false` while the hand is missing).
   * Returns the finished swipe's slice count when a swipe ends, otherwise 0.
   */
  update(now: number, fast: boolean): number {
    if (fast) {
      this.inSwipe = true;
      this.slowSince = null;
      return 0;
    }
    if (!this.inSwipe) return 0;

    if (this.slowSince === null) this.slowSince = now;
    if (now - this.slowSince >= this.endAfterMs) return this.end();
    return 0;
  }

  /** Count a slice in the current swipe; returns the running count. */
  addSlice(): number {
    this.inSwipe = true;
    this.count += 1;
    return this.count;
  }

  /** Force the swipe to end (e.g. round over); returns its slice count. */
  end(): number {
    const finished = this.count;
    this.inSwipe = false;
    this.slowSince = null;
    this.count = 0;
    return finished;
  }
}
