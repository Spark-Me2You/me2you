import { describe, expect, it } from "vitest";
import { SlashTrail, trailFade } from "./SlashTrail";

const LIFETIME = 300;

describe("trailFade", () => {
  it("fades linearly by age", () => {
    expect(trailFade(0, LIFETIME)).toBe(1);
    expect(trailFade(150, LIFETIME)).toBeCloseTo(0.5);
    expect(trailFade(300, LIFETIME)).toBe(0);
    expect(trailFade(1000, LIFETIME)).toBe(0);
  });
});

describe("SlashTrail", () => {
  it("drops points once they are older than the lifetime", () => {
    const trail = new SlashTrail(32, LIFETIME, 0);
    trail.push(0, 0, 0, true);
    trail.push(10, 0, 100, false);
    trail.push(20, 0, 200, false);
    expect(trail.getAlive(250)).toHaveLength(3);
    expect(trail.getAlive(350).map((p) => p.t)).toEqual([100, 200]);
    expect(trail.getAlive(600)).toHaveLength(0);
  });

  it("fades by age, not point count, so frame rate doesn't change the look", () => {
    const slow = new SlashTrail(64, LIFETIME, 0);
    const fast = new SlashTrail(64, LIFETIME, 0);
    for (let t = 0; t <= 240; t += 40) slow.push(t, 0, t, t === 0); // 25 Hz
    for (let t = 0; t <= 240; t += 8) fast.push(t, 0, t, t === 0); // 125 Hz
    const now = 250;

    expect(fast.getAlive(now).length).toBeGreaterThan(slow.getAlive(now).length);
    // Points sampled at the same moment have identical fade in both trails.
    for (const t of [0, 80, 160, 240]) {
      expect(fast.fadeAt(t, now)).toBe(slow.fadeAt(t, now));
    }
    // ...and the oldest visible point is equally faded.
    expect(fast.fadeAt(fast.getAlive(now)[0].t, now)).toBe(slow.fadeAt(slow.getAlive(now)[0].t, now));
  });

  it("never smooths the head: the newest point is the raw fingertip", () => {
    const trail = new SlashTrail(32, LIFETIME, 1);
    trail.push(0, 0, 0, true);
    trail.push(100, 80, 10, false);
    trail.push(200, 0, 20, false);
    const alive = trail.getAlive(25);
    expect(alive[2]).toMatchObject({ x: 200, y: 0 });
    // The middle point was relaxed toward its neighbours.
    expect(alive[1].y).toBeLessThan(80);
  });

  it("does not smooth across a stroke break", () => {
    const trail = new SlashTrail(32, LIFETIME, 1);
    trail.push(0, 0, 0, true);
    trail.push(100, 80, 10, false);
    trail.push(900, 900, 20, true); // hand reappeared elsewhere
    const alive = trail.getAlive(25);
    expect(alive[1]).toMatchObject({ x: 100, y: 80 });
    expect(alive[2].stroke).not.toBe(alive[1].stroke);
  });

  it("keeps the newest points when the ring buffer wraps", () => {
    const trail = new SlashTrail(4, 10_000, 0);
    for (let i = 0; i < 10; i++) trail.push(i, 0, i, i === 0);
    expect(trail.getAlive(10).map((p) => p.x)).toEqual([6, 7, 8, 9]);
  });
});
