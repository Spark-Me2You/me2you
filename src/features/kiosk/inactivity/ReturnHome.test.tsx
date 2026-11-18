import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import type { ReactNode } from "react";

const cursorRef = { current: { x: 0, y: 0, visible: false, isPinched: false } };
const handRef = { current: { detected: false, timestamp: 0 } };

const faceRef = { current: null };

vi.mock("./useFacePresence", () => ({ useFacePresence: () => faceRef }));
vi.mock("@/core/cv/cursor/CvCursorEnabledContext", () => ({
  useCvCursorEnabled: () => ({ cursorStateRef: cursorRef, handTrackRef: handRef }),
}));

import { StateProvider, useAppState } from "@/core/state-machine";
import { AppState } from "@/core/state-machine/appStateMachine";
import { KioskActivityProvider, useKioskActivity } from "./KioskActivityContext";
import { ReturnHome } from "./ReturnHome";
import { RETURN_HOME_TIMELINE as T } from "./ReturnHomeOverlay";

const COUNTDOWN_MS = T.greetMs + T.countdownFrom * T.countdownStepMs;

let api: { state: AppState; goTo: (s: AppState) => void; mark: () => void };

function Probe() {
  const { currentState, transitionTo } = useAppState();
  const { markActivity } = useKioskActivity();
  useEffect(() => {
    api = { state: currentState, goTo: transitionTo, mark: markActivity };
  });
  return null;
}

function Harness({ children }: { children?: ReactNode }) {
  return (
    <StateProvider>
      <KioskActivityProvider>
        <Probe />
        <ReturnHome />
        {children}
      </KioskActivityProvider>
    </StateProvider>
  );
}

/** Advance in 250ms acts so each phase's re-render can schedule the next phase timer. */
function advance(ms: number) {
  for (let left = ms; left > 0; left -= 250) {
    act(() => {
      vi.advanceTimersByTime(Math.min(250, left));
    });
  }
}

const overlay = () => screen.queryByTestId("return-home-overlay");

describe("ReturnHome", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cursorRef.current = { x: 0, y: 0, visible: false, isPinched: false };
    handRef.current = { detected: false, timestamp: 0 };
    render(<Harness />);
  });
  afterEach(() => vi.useRealTimers());

  it("never fires on Home", () => {
    advance(120_000);
    expect(overlay()).toBeNull();
  });

  it("warns after 45s idle on another screen, counts down, then wipes back Home", () => {
    act(() => api.goTo(AppState.HUB));
    advance(44_500);
    expect(overlay()).toBeNull();
    advance(750);
    expect(overlay()?.dataset.phase).toBe("greet");
    expect(screen.getByText("hey, anyone there?")).toBeTruthy();

    advance(T.greetMs);
    expect(overlay()?.dataset.phase).toBe("count");
    expect(screen.getByText("5")).toBeTruthy();
    advance(T.countdownStepMs * 4);
    expect(screen.getByText("1")).toBeTruthy();

    advance(T.countdownStepMs);
    expect(overlay()?.dataset.phase).toBe("wipe-in");
    expect(api.state).toBe(AppState.HUB);

    advance(T.wipeInMs + T.holdMs);
    expect(api.state).toBe(AppState.IDLE);
    expect(overlay()?.dataset.phase).toBe("wipe-out");

    advance(T.wipeOutMs);
    expect(overlay()).toBeNull();
  });

  it("cancels the warning on cursor activity before the wipe", () => {
    act(() => api.goTo(AppState.GAMES));
    advance(45_250);
    advance(T.greetMs + 1_000);
    expect(overlay()).not.toBeNull();
    cursorRef.current = { ...cursorRef.current, visible: true };
    advance(250);
    expect(overlay()).toBeNull();
    expect(api.state).toBe(AppState.GAMES);
  });

  it("can't be cancelled once the wipe starts", () => {
    act(() => api.goTo(AppState.DISCOVERY));
    advance(45_250 + COUNTDOWN_MS);
    expect(overlay()?.dataset.phase).toBe("wipe-in");
    cursorRef.current = { ...cursorRef.current, visible: true };
    advance(T.wipeInMs + T.holdMs);
    expect(api.state).toBe(AppState.IDLE);
  });

  it("treats game-reported activity and a detected hand as activity", () => {
    act(() => api.goTo(AppState.GAMES));
    for (let t = 0; t < 60_000; t += 500) {
      if (t < 30_000) api.mark();
      else handRef.current = { detected: true, timestamp: performance.now() };
      advance(500);
    }
    expect(overlay()).toBeNull();
  });

  it("stops the warning if the visitor leaves for Home themselves", () => {
    act(() => api.goTo(AppState.HUB));
    advance(45_250);
    expect(overlay()).not.toBeNull();
    act(() => api.goTo(AppState.IDLE));
    expect(overlay()).toBeNull();
  });
});
