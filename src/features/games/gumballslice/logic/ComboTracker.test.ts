import { describe, expect, it } from "vitest";
import { ComboTracker } from "./ComboTracker";

const END_MS = 150;

describe("ComboTracker", () => {
  it("groups slices in one fast stroke and reports them when the swipe ends", () => {
    const combo = new ComboTracker(END_MS);
    expect(combo.update(0, true)).toBe(0);
    combo.addSlice();
    expect(combo.update(33, true)).toBe(0);
    combo.addSlice();
    combo.addSlice();
    expect(combo.current).toBe(3);

    expect(combo.update(66, false)).toBe(0); // slow starts here
    expect(combo.update(200, false)).toBe(0); // 134ms slow: still the same swipe
    expect(combo.update(216, false)).toBe(3); // 150ms slow: swipe over
    expect(combo.current).toBe(0);
  });

  it("keeps one swipe through a brief slow-down", () => {
    const combo = new ComboTracker(END_MS);
    combo.update(0, true);
    combo.addSlice();
    combo.update(33, false);
    combo.update(100, false); // 67ms slow
    combo.update(133, true); // fast again before the swipe ended
    combo.addSlice();
    combo.addSlice();
    expect(combo.update(300, false)).toBe(0);
    expect(combo.update(450, false)).toBe(3);
  });

  it("counts separate swipes separately", () => {
    const combo = new ComboTracker(END_MS);
    combo.update(0, true);
    combo.addSlice();
    combo.addSlice();
    combo.update(50, false);
    expect(combo.update(200, false)).toBe(2);

    combo.update(400, true);
    combo.addSlice();
    combo.update(450, false);
    expect(combo.update(600, false)).toBe(1);
  });

  it("reports nothing when no swipe is in progress", () => {
    const combo = new ComboTracker(END_MS);
    expect(combo.update(0, false)).toBe(0);
    expect(combo.update(1000, false)).toBe(0);
  });

  it("end() settles the current swipe immediately", () => {
    const combo = new ComboTracker(END_MS);
    combo.update(0, true);
    combo.addSlice();
    combo.addSlice();
    combo.addSlice();
    expect(combo.end()).toBe(3);
    expect(combo.end()).toBe(0);
  });
});
