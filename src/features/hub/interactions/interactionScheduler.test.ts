import { describe, expect, it, vi } from "vitest";
import { InteractionScheduler } from "./interactionScheduler";
import type { InteractionActor, InteractionDefinition } from "./types";

function fakeActor(id: string, x: number, y = 0) {
  return {
    id,
    x,
    y,
    isBusy: false,
    setControlled: vi.fn(),
    setOffset: vi.fn(),
    setRotation: vi.fn(),
  } satisfies InteractionActor;
}

function definition(overrides: Partial<InteractionDefinition> = {}): InteractionDefinition {
  return {
    id: "test",
    maxDistance: 100,
    durationFrames: 10,
    weight: 1,
    update: vi.fn(),
    ...overrides,
  };
}

// Always start on the first check, pick the first candidate.
const eager = { checkIntervalFrames: 1, startChance: 1, cooldownFrames: 50, random: () => 0 };

describe("InteractionScheduler", () => {
  it("does nothing with no definitions registered", () => {
    const scheduler = new InteractionScheduler([], eager);
    const a = fakeActor("a", 0);
    scheduler.tick(1, [a, fakeActor("b", 10)]);
    expect(a.setControlled).not.toHaveBeenCalled();
  });

  it("starts an interaction between two nearby actors and runs it to the end", () => {
    const end = vi.fn();
    const def = definition({ end });
    const scheduler = new InteractionScheduler([def], eager);
    const a = fakeActor("a", 0);
    const b = fakeActor("b", 50);

    scheduler.tick(1, [a, b]);
    expect(a.setControlled).toHaveBeenCalledWith(true);
    expect(b.setControlled).toHaveBeenCalledWith(true);
    expect(scheduler.isInteracting("a")).toBe(true);

    for (let i = 0; i < 10; i++) scheduler.tick(1, [a, b]);
    expect(def.update).toHaveBeenLastCalledWith(a, b, 1);
    expect(end).toHaveBeenCalledOnce();
    expect(a.setControlled).toHaveBeenLastCalledWith(false);
    expect(a.setOffset).toHaveBeenLastCalledWith(0, 0);
    expect(scheduler.activeCount).toBe(0);
  });

  it("ignores actors that are too far apart, busy, or rejected by canStart", () => {
    const far = new InteractionScheduler([definition()], eager);
    far.tick(1, [fakeActor("a", 0), fakeActor("b", 500)]);
    expect(far.activeCount).toBe(0);

    const busy = new InteractionScheduler([definition()], eager);
    busy.tick(1, [{ ...fakeActor("a", 0), isBusy: true }, fakeActor("b", 10)]);
    expect(busy.activeCount).toBe(0);

    const gated = new InteractionScheduler([definition({ canStart: () => false })], eager);
    gated.tick(1, [fakeActor("a", 0), fakeActor("b", 10)]);
    expect(gated.activeCount).toBe(0);
  });

  it("puts actors on cooldown after an interaction", () => {
    const scheduler = new InteractionScheduler([definition({ durationFrames: 1 })], eager);
    const actors = [fakeActor("a", 0), fakeActor("b", 10)];

    scheduler.tick(1, actors); // start
    scheduler.tick(1, actors); // finish; both on cooldown so no restart
    scheduler.tick(1, actors);
    expect(scheduler.activeCount).toBe(0);

    scheduler.tick(60, actors); // cooldown expires, so the same check starts a new one
    expect(scheduler.activeCount).toBe(1);
  });

  it("respects startChance and the check interval", () => {
    const scheduler = new InteractionScheduler([definition()], {
      ...eager,
      checkIntervalFrames: 30,
      random: () => 0.9,
      startChance: 0.5,
    });
    const actors = [fakeActor("a", 0), fakeActor("b", 10)];
    for (let i = 0; i < 100; i++) scheduler.tick(1, actors);
    expect(scheduler.activeCount).toBe(0);
  });

  it("releases everyone on cancelAll and cancelFor", () => {
    const scheduler = new InteractionScheduler([definition({ durationFrames: 1000 })], {
      ...eager,
      maxConcurrent: 2,
    });
    const actors = [fakeActor("a", 0), fakeActor("b", 10), fakeActor("c", 300), fakeActor("d", 310)];
    scheduler.tick(1, actors);
    scheduler.tick(1, actors);
    expect(scheduler.activeCount).toBe(2);

    scheduler.cancelFor("a");
    expect(scheduler.activeCount).toBe(1);
    expect(actors[1].setControlled).toHaveBeenLastCalledWith(false);

    scheduler.cancelAll();
    expect(scheduler.activeCount).toBe(0);
    expect(actors[3].setControlled).toHaveBeenLastCalledWith(false);
  });
});
