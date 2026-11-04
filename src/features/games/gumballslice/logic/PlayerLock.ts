/**
 * Player Lock
 * Keeps a round tied to the player who started it. The shared HandLandmarker
 * reports one hand per frame, so when a bystander's hand is picked instead we
 * reject it: it is much smaller (further from the camera) than the locked
 * player's hand, or it appears far away from where the player's hand just was.
 */

export interface HandObservation {
  detected: boolean;
  handScale: number;
  wristX: number;
  wristY: number;
  timestamp: number;
}

export interface PlayerLockOptions {
  minScaleRatio: number;
  maxJump: number;
  jumpWindowMs: number;
  scaleAdapt: number;
}

export class PlayerLock {
  private scale = 0;
  private lastX = 0;
  private lastY = 0;
  private lastAcceptedAt = 0;
  private readonly options: PlayerLockOptions;

  constructor(options: PlayerLockOptions) {
    this.options = options;
  }

  lock(hand: HandObservation): void {
    this.scale = hand.handScale;
    this.remember(hand);
  }

  /** True if this observation belongs to the locked player. */
  accept(hand: HandObservation): boolean {
    if (!hand.detected) return false;

    const { minScaleRatio, maxJump, jumpWindowMs, scaleAdapt } = this.options;
    if (hand.handScale < this.scale * minScaleRatio) return false;

    const recentlySeen = hand.timestamp - this.lastAcceptedAt <= jumpWindowMs;
    const jump = Math.hypot(hand.wristX - this.lastX, hand.wristY - this.lastY);
    if (recentlySeen && jump > maxJump) return false;

    // Follow the player slowly as they step closer or further away.
    this.scale += (hand.handScale - this.scale) * scaleAdapt;
    this.remember(hand);
    return true;
  }

  /** Restart the "missing" clock, e.g. when a round begins. */
  touch(now: number): void {
    this.lastAcceptedAt = now;
  }

  msSinceSeen(now: number): number {
    return now - this.lastAcceptedAt;
  }

  private remember(hand: HandObservation): void {
    this.lastX = hand.wristX;
    this.lastY = hand.wristY;
    this.lastAcceptedAt = hand.timestamp;
  }
}
