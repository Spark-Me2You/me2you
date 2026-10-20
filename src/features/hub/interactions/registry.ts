/**
 * Interaction registry
 * Add InteractionDefinitions here to make them play in the hub. Empty for now, so the
 * scheduler runs but never starts anything. `hop` below is a template, not registered.
 */

import type { InteractionDefinition } from "./types";

/**
 * Template: both walkers hop twice, out of phase.
 * TODO: replace with real paired animations (face each other, high five, wave, dance)
 * once art for them exists; register them in HUB_INTERACTIONS.
 */
export const hopTemplate: InteractionDefinition = {
  id: "hop",
  maxDistance: 140,
  durationFrames: 90,
  weight: 1,
  update: (a, b, progress) => {
    const hop = (phase: number) => -Math.abs(Math.sin(phase * Math.PI * 2)) * 18;
    a.setOffset(0, hop(progress));
    b.setOffset(0, hop(progress + 0.25));
  },
};

export const HUB_INTERACTIONS: InteractionDefinition[] = [];
