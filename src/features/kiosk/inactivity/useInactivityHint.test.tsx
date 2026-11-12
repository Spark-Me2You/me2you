import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";

const faceRef: { current: number | null } = { current: null };
const cursorRef = { current: { x: 0, y: 0, visible: false, isPinched: false } };
const handRef = { current: { detected: false, timestamp: 0 } };

vi.mock("./useFacePresence", () => ({ useFacePresence: () => faceRef }));
vi.mock("@/core/cv/cursor/CvCursorEnabledContext", () => ({
  useCvCursorEnabled: () => ({ cursorStateRef: cursorRef, handTrackRef: handRef }),
}));

import { useInactivityHint } from "./useInactivityHint";
import { InactivityHint, INACTIVITY_HINT_DURATION_MS } from "./InactivityHint";

const config = { idleMs: 30_000, presenceGraceMs: 1_500 };

/** Advance fake time while keeping the face "seen" every tick. */
function idleFor(ms: number) {
  for (let t = 0; t < ms; t += 250) {
    faceRef.current = performance.now();
    act(() => {
      vi.advanceTimersByTime(250);
    });
  }
}

describe("useInactivityHint", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    faceRef.current = null;
    cursorRef.current = { x: 0, y: 0, visible: false, isPinched: false };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the hint after 30s of a present, inactive visitor", () => {
    const { result } = renderHook(() => useInactivityHint(true, config));
    idleFor(29_000);
    expect(result.current.hinting).toBe(false);
    idleFor(1_500);
    expect(result.current.hinting).toBe(true);
  });

  it("does nothing with no one in frame", () => {
    const { result } = renderHook(() => useInactivityHint(true, config));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.hinting).toBe(false);
  });

  it("cancels the hint when the cursor comes up", () => {
    const { result } = renderHook(() => useInactivityHint(true, config));
    idleFor(30_500);
    expect(result.current.hinting).toBe(true);
    cursorRef.current = { ...cursorRef.current, visible: true };
    idleFor(250);
    expect(result.current.hinting).toBe(false);
  });

  it("stays off while disabled", () => {
    const { result } = renderHook(() => useInactivityHint(false, config));
    idleFor(31_000);
    expect(result.current.hinting).toBe(false);
  });

  it("endHint stops the hint", () => {
    const { result } = renderHook(() => useInactivityHint(true, config));
    idleFor(30_500);
    act(() => result.current.endHint());
    expect(result.current.hinting).toBe(false);
  });
});

describe("InactivityHint", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders the swiping hand as a non-interactive overlay", () => {
    render(<InactivityHint onDone={() => {}} />);
    const overlay = screen.getByTestId("inactivity-hint");
    expect(overlay.className).toContain("pointer-events-none");
    expect(overlay.querySelector("img")?.className).toContain("animate-inactivity-swipe");
  });

  // jsdom has no AnimationEvent, so React's onAnimationEnd can't fire here; this covers the backstop.
  it("reports done after the three swipes even if animationend never fires", () => {
    const onDone = vi.fn();
    render(<InactivityHint onDone={onDone} />);
    act(() => {
      vi.advanceTimersByTime(INACTIVITY_HINT_DURATION_MS + 500);
    });
    expect(onDone).toHaveBeenCalled();
  });
});
