/**
 * Hub interactions
 * Short paired animations two nearby walkers play together (high five, wave, dance...).
 * See docs/HUB.md for how to add one.
 */

/** The control surface a walker hands to an interaction while it is running. */
export interface InteractionActor {
  readonly id: string;
  /** Ground position (feet), in room coordinates. */
  readonly x: number;
  readonly y: number;
  /** True while the walker is mid-jump or otherwise can't be grabbed. */
  readonly isBusy: boolean;
  /** While controlled, the walker stops its own idle/walk/jump loop and holds still. */
  setControlled(controlled: boolean): void;
  /** Visual offset from the ground position (hops, leans). Reset to 0,0 when released. */
  setOffset(dx: number, dy: number): void;
  /** Visual rotation in radians. Reset to 0 when released. */
  setRotation(radians: number): void;
}

export interface InteractionDefinition {
  id: string;
  /** Maximum distance between the two walkers' feet for this interaction to start. */
  maxDistance: number;
  /** Length in ticker frames (60 ≈ 1 s). */
  durationFrames: number;
  /** Relative chance of being picked when several definitions fit a pair. */
  weight: number;
  /** Optional extra gate, e.g. only when both are idle or both wear a hat. */
  canStart?: (a: InteractionActor, b: InteractionActor) => boolean;
  /** Called once when the interaction begins. */
  start?: (a: InteractionActor, b: InteractionActor) => void;
  /** Called every frame with progress in [0, 1]. */
  update: (a: InteractionActor, b: InteractionActor, progress: number) => void;
  /** Called once when it ends, before both walkers are released. */
  end?: (a: InteractionActor, b: InteractionActor) => void;
}
