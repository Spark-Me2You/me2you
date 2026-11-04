import { describe, expect, it } from "vitest";
import { PlayerLock, type HandObservation } from "./PlayerLock";

const options = { minScaleRatio: 0.55, maxJump: 0.3, jumpWindowMs: 500, scaleAdapt: 0.05 };

const hand = (overrides: Partial<HandObservation>): HandObservation => ({
  detected: true,
  handScale: 0.1,
  wristX: 0.5,
  wristY: 0.5,
  timestamp: 0,
  ...overrides,
});

describe("PlayerLock", () => {
  it("accepts the locked player's hand as it moves", () => {
    const lock = new PlayerLock(options);
    lock.lock(hand({}));
    expect(lock.accept(hand({ wristX: 0.6, timestamp: 33 }))).toBe(true);
    expect(lock.accept(hand({ wristX: 0.7, timestamp: 66 }))).toBe(true);
  });

  it("rejects a bystander's smaller (further away) hand", () => {
    const lock = new PlayerLock(options);
    lock.lock(hand({}));
    expect(lock.accept(hand({ handScale: 0.04, timestamp: 33 }))).toBe(false);
  });

  it("rejects a hand that teleports across the frame", () => {
    const lock = new PlayerLock(options);
    lock.lock(hand({ wristX: 0.2 }));
    expect(lock.accept(hand({ wristX: 0.85, timestamp: 33 }))).toBe(false);
  });

  it("re-acquires the player after a gap even if they moved", () => {
    const lock = new PlayerLock(options);
    lock.lock(hand({ wristX: 0.2 }));
    expect(lock.accept(hand({ wristX: 0.85, timestamp: 1200 }))).toBe(true);
  });

  it("measures how long the player has been missing", () => {
    const lock = new PlayerLock(options);
    lock.lock(hand({ timestamp: 1000 }));
    lock.accept(hand({ detected: false, timestamp: 1500 }));
    expect(lock.msSinceSeen(4000)).toBe(3000);
  });
});
