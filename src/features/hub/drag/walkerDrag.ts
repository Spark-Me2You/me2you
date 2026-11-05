/**
 * Walker dragging
 * Tells a click from a pick-up, and works out where a held walker hangs and lands.
 * Pure functions: no Pixi, so it is unit-tested directly.
 */

import type { DoorSide } from "../rooms/rooms";

export interface PressLimits {
  /** Pointer travel (px) that turns a press into a drag. */
  distance: number;
  /** Press length (ms) that turns a press into a drag, even if the pointer stays still. */
  holdMs: number;
}

export const MOUSE_PRESS_LIMITS: PressLimits = { distance: 8, holdMs: 200 };

/**
 * Looser than a mouse: curling the thumb to pinch moves the fingertip that steers the cursor,
 * and a pinch naturally lasts longer than a mouse click.
 */
export const HAND_PRESS_LIMITS: PressLimits = { distance: 40, holdMs: 500 };

/** How long (ms) a pinch must stay released to count, since tracking can drop for a few frames. */
export const HAND_RELEASE_GRACE_MS = 150;

/** Height (px) a walker rises off the pointer when picked up. */
export const HOLD_LIFT = 16;

const SWAY_AMPLITUDE = 0.14;
const SWAY_SPEED = 0.09;
const SWAY_RAMP_FRAMES = 20;

/**
 * One press on a walker. It is a click until it travels or lasts long enough to become a
 * drag, and never goes back, so a single press can only ever be one or the other.
 */
export class PressGesture {
  private readonly startX: number;
  private readonly startY: number;
  private readonly startTime: number;
  private readonly limits: PressLimits;
  private dragging = false;

  constructor(x: number, y: number, now: number, limits: PressLimits = MOUSE_PRESS_LIMITS) {
    this.startX = x;
    this.startY = y;
    this.startTime = now;
    this.limits = limits;
  }

  get isDragging(): boolean {
    return this.dragging;
  }

  /** Feed the pointer position and time. Returns true on the update that starts the drag. */
  update(x: number, y: number, now: number): boolean {
    if (this.dragging) return false;
    const travelled = Math.hypot(x - this.startX, y - this.startY);
    this.dragging = travelled >= this.limits.distance || now - this.startTime >= this.limits.holdMs;
    return this.dragging;
  }
}

/** How close (px) to a screen edge the pointer must be to carry a walker through it. */
export const EDGE_ZONE = 60;
/** How long (ms) the pointer must stay at an edge, so swiping past one doesn't change rooms. */
export const EDGE_DWELL_MS = 300;

/** The nearest screen edge with a door that the pointer is close enough to, if any. */
export function doorEdgeAt(
  x: number,
  y: number,
  width: number,
  height: number,
  doors: Partial<Record<DoorSide, unknown>>,
): DoorSide | null {
  const distances: [DoorSide, number][] = [
    ["left", x],
    ["right", width - x],
    ["top", y],
    ["bottom", height - y],
  ];
  let nearest: DoorSide | null = null;
  let nearestDistance = EDGE_ZONE;
  for (const [side, distance] of distances) {
    if (doors[side] && distance < nearestDistance) {
      nearest = side;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/**
 * Decides when a held walker crosses an edge. After a crossing, or when the press began at an
 * edge, the pointer must leave the edge first: arriving in a room with the pointer on that room's
 * door edge must not carry the walker straight on to the next room.
 */
export class EdgeDwell {
  private armed: boolean;
  private side: DoorSide | null = null;
  private since = 0;

  constructor(startsAtEdge: boolean) {
    this.armed = !startsAtEdge;
  }

  /** Feed the current door edge and time. Returns the side on the update that crosses it. */
  update(side: DoorSide | null, now: number): DoorSide | null {
    if (side === null) {
      this.armed = true;
      this.side = null;
      return null;
    }
    if (!this.armed) return null;
    if (side !== this.side) {
      this.side = side;
      this.since = now;
    }
    if (now - this.since < EDGE_DWELL_MS) return null;
    this.armed = false;
    this.side = null;
    return side;
  }
}

/** Side-to-side tilt (radians) of a held walker, easing in from upright. */
export function swayAngle(heldFrames: number): number {
  const ramp = Math.min(1, heldFrames / SWAY_RAMP_FRAMES);
  return SWAY_AMPLITUDE * ramp * Math.sin(heldFrames * SWAY_SPEED);
}

export interface HoldBounds {
  minX: number;
  maxX: number;
  /** Highest feet position that keeps the walker on screen. */
  minY: number;
  /** Top edge of the walkable floor. */
  floorTop: number;
  /** Bottom edge of the walkable floor. */
  maxY: number;
}

export interface HeldPose {
  /** Where the walker's feet are drawn. */
  x: number;
  y: number;
  /** Where the walker's feet land when dropped from here. */
  groundY: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Held walkers can go anywhere on screen; a drop lands them on the nearest floor below. */
export function getHeldPose(
  targetX: number,
  targetY: number,
  lift: number,
  bounds: HoldBounds,
): HeldPose {
  return {
    x: clamp(targetX, bounds.minX, bounds.maxX),
    y: clamp(targetY - lift, bounds.minY, bounds.maxY),
    groundY: clamp(targetY, bounds.floorTop, bounds.maxY),
  };
}
