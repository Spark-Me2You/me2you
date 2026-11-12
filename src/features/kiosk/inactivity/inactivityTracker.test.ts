import { describe, it, expect } from "vitest";
import { INITIAL_INACTIVITY_STATE, isPresent, stepInactivity } from "./inactivityTracker";
import type { InactivityInput, InactivityState } from "./inactivityTracker";

const config = { idleMs: 30_000, presenceGraceMs: 1_500 };

/** Run the tracker at 250ms ticks from `from` to `to` with the face seen every tick. */
function run(state: InactivityState, from: number, to: number, overrides: Partial<InactivityInput> = {}) {
  const actions: { at: number; action: string }[] = [];
  for (let now = from; now <= to; now += 250) {
    const r = stepInactivity(state, { now, lastFaceAt: now, active: false, hinting: false, ...overrides }, config);
    state = r.state;
    if (r.action !== "none") actions.push({ at: now, action: r.action });
  }
  return { state, actions };
}

describe("isPresent", () => {
  it("is false when no face was ever seen", () => {
    expect(isPresent(1000, null, 1500)).toBe(false);
  });
  it("rides out short dropouts within the grace window", () => {
    expect(isPresent(2400, 1000, 1500)).toBe(true);
    expect(isPresent(2600, 1000, 1500)).toBe(false);
  });
});

describe("stepInactivity", () => {
  it("starts the hint after 30s of presence without cursor activity", () => {
    const { actions } = run(INITIAL_INACTIVITY_STATE, 0, 31_000);
    expect(actions).toEqual([{ at: 30_000, action: "start-hint" }]);
  });

  it("never fires when nobody is in frame", () => {
    const { actions } = run(INITIAL_INACTIVITY_STATE, 0, 60_000, { lastFaceAt: null });
    expect(actions).toEqual([]);
  });

  it("resets the clock when the cursor is used", () => {
    let { state } = run(INITIAL_INACTIVITY_STATE, 0, 20_000);
    state = stepInactivity(state, { now: 20_250, lastFaceAt: 20_250, active: true, hinting: false }, config).state;
    expect(state.idleSince).toBeNull();
    // The 30s restart from the first idle tick after activity (20.5s), not from 0.
    const { actions } = run(state, 20_500, 51_000);
    expect(actions).toEqual([{ at: 50_500, action: "start-hint" }]);
  });

  it("resets the clock when the person leaves the frame", () => {
    const { state } = run(INITIAL_INACTIVITY_STATE, 0, 20_000);
    const gone = stepInactivity(state, { now: 25_000, lastFaceAt: 20_000, active: false, hinting: false }, config);
    expect(gone.state.idleSince).toBeNull();
    expect(gone.action).toBe("none");
  });

  it("cancels a playing hint on activity or when the person leaves", () => {
    const base = { now: 1000, lastFaceAt: 1000, active: false, hinting: true };
    expect(stepInactivity({ idleSince: null }, { ...base, active: true }, config).action).toBe("cancel-hint");
    expect(stepInactivity({ idleSince: null }, { ...base, lastFaceAt: null }, config).action).toBe("cancel-hint");
  });

  it("pauses while hinting and replays 30s after the hint ends", () => {
    const first = run(INITIAL_INACTIVITY_STATE, 0, 30_000);
    expect(first.actions.at(-1)?.action).toBe("start-hint");
    // Hint plays for ~5s: the clock stays reset.
    const during = run(first.state, 30_250, 35_000, { hinting: true });
    expect(during.actions).toEqual([]);
    expect(during.state.idleSince).toBeNull();
    // After it ends the clock restarts, so the next hint lands 30s later.
    const after = run(during.state, 35_250, 66_000);
    expect(after.actions).toEqual([{ at: 65_250, action: "start-hint" }]);
  });
});
