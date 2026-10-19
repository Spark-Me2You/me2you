/**
 * Start Gate
 * The round starts when a close-enough player holds up an open hand or a fist
 * for `holdMs`. The pointing pose is excluded because that is how visitors
 * aim the cursor at buttons on the same screen. Short tracking dropouts
 * (under `graceMs`) don't reset the hold.
 */

export interface StartObservation {
  detected: boolean;
  pointing: boolean;
  handScale: number;
}

export class StartGate {
  private heldSince: number | null = null;
  private lastSeen = 0;
  private readonly holdMs: number;
  private readonly graceMs: number;
  private readonly minHandScale: number;

  constructor(holdMs: number, graceMs: number, minHandScale: number) {
    this.holdMs = holdMs;
    this.graceMs = graceMs;
    this.minHandScale = minHandScale;
  }

  /** Feed the latest hand (or `null` if none/stale). Returns hold progress 0..1. */
  update(hand: StartObservation | null, now: number): number {
    const raised =
      !!hand && hand.detected && !hand.pointing && hand.handScale >= this.minHandScale;

    if (raised) {
      if (this.heldSince === null) this.heldSince = now;
      this.lastSeen = now;
    } else if (this.heldSince !== null && now - this.lastSeen > this.graceMs) {
      this.heldSince = null;
    }

    if (this.heldSince === null) return 0;
    return Math.min(1, (now - this.heldSince) / this.holdMs);
  }

  reset(): void {
    this.heldSince = null;
  }
}
