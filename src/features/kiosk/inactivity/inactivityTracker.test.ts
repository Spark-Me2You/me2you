import { describe, it, expect } from "vitest";
import { INITIAL_INACTIVITY_STATE, isPresent, stepInactivity } from "./inactivityTracker";
import type { InactivityInput, InactivityState } from "./inactivityTracker";

const config = { idleMs: 30_000, presenceGraceMs: 1_500 };

/** Run the tracker at 250ms ticks from `from` to `to` with someone present every tick. */
function run(state: InactivityState, from: number, to: number, overrides: Partial<InactivityInput> = {}) {
  const actions: { at: number; action: string }[] = [];
  for (let now = from; now <= to; now += 250) {
    const r = stepInactivity(state, { now, present: true, active: false, prompting: false, ...overrides }, config);
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
    expect(actions).toEqual([{ at: 30_000, action: "start-prompt" }]);
  });

  it("never fires when nobody is in frame", () => {
    const { actions } = run(INITIAL_INACTIVITY_STATE, 0, 60_000, { present: false });
    expect(actions).toEqual([]);
  });

  it("resets the clock when the cursor is used", () => {
    let { state } = run(INITIAL_INACTIVITY_STATE, 0, 20_000);
    state = stepInactivity(state, { now: 20_250, present: true, active: true, prompting: false }, config).state;
    expect(state.idleSince).toBeNull();
    // The 30s restart from the first idle tick after activity (20.5s), not from 0.
    const { actions } = run(state, 20_500, 51_000);
    expect(actions).toEqual([{ at: 50_500, action: "start-prompt" }]);
  });

  it("resets the clock when the person is no longer present", () => {
    const { state } = run(INITIAL_INACTIVITY_STATE, 0, 20_000);
    const gone = stepInactivity(state, { now: 25_000, present: false, active: false, prompting: false }, config);
    expect(gone.state.idleSince).toBeNull();
    expect(gone.action).toBe("none");
  });

  it("cancels a playing prompt on activity or when the person leaves", () => {
    const base = { now: 1000, present: true, active: false, prompting: true };
    expect(stepInactivity({ idleSince: null }, { ...base, active: true }, config).action).toBe("cancel-prompt");
    expect(stepInactivity({ idleSince: null }, { ...base, present: false }, config).action).toBe("cancel-prompt");
  });

  it("pauses while prompting and replays 30s after the hint ends", () => {
    const first = run(INITIAL_INACTIVITY_STATE, 0, 30_000);
    expect(first.actions.at(-1)?.action).toBe("start-prompt");
    // Hint plays for ~5s: the clock stays reset.
    const during = run(first.state, 30_250, 35_000, { prompting: true });
    expect(during.actions).toEqual([]);
    expect(during.state.idleSince).toBeNull();
    // After it ends the clock restarts, so the next hint lands 30s later.
    const after = run(during.state, 35_250, 66_000);
    expect(after.actions).toEqual([{ at: 65_250, action: "start-prompt" }]);
  });
});
