import { describe, expect, it } from "vitest";
import {
  EDGE_DWELL_MS,
  EDGE_ZONE,
  EdgeDwell,
  HAND_PRESS_LIMITS,
  MOUSE_PRESS_LIMITS,
  PressGesture,
  doorEdgeAt,
  getHeldPose,
  swayAngle,
  type HoldBounds,
} from "./walkerDrag";

describe("PressGesture", () => {
  it("stays a click for a quick press that barely moves", () => {
    const { distance, holdMs } = MOUSE_PRESS_LIMITS;
    const gesture = new PressGesture(100, 100, 0);
    expect(gesture.update(100 + distance - 1, 100, holdMs - 1)).toBe(false);
    expect(gesture.isDragging).toBe(false);
  });

  it("becomes a drag once the pointer travels far enough", () => {
    const gesture = new PressGesture(100, 100, 0);
    expect(gesture.update(100, 100 + MOUSE_PRESS_LIMITS.distance, 10)).toBe(true);
    expect(gesture.isDragging).toBe(true);
  });

  it("becomes a drag when held still long enough", () => {
    const gesture = new PressGesture(100, 100, 0);
    expect(gesture.update(100, 100, MOUSE_PRESS_LIMITS.holdMs)).toBe(true);
    expect(gesture.isDragging).toBe(true);
  });

  it("gives a hand press more room, so a normal pinch stays a click", () => {
    const gesture = new PressGesture(100, 100, 0, HAND_PRESS_LIMITS);
    gesture.update(100 + MOUSE_PRESS_LIMITS.distance * 2, 100, MOUSE_PRESS_LIMITS.holdMs * 2);
    expect(gesture.isDragging).toBe(false);
    expect(gesture.update(100, 100, HAND_PRESS_LIMITS.holdMs)).toBe(true);
  });

  it("reports the start once and stays a drag after returning to the start point", () => {
    const gesture = new PressGesture(100, 100, 0);
    expect(gesture.update(200, 100, 10)).toBe(true);
    expect(gesture.update(100, 100, 20)).toBe(false);
    expect(gesture.isDragging).toBe(true);
  });
});

describe("doorEdgeAt", () => {
  const allDoors = { top: 1, bottom: 1, left: 1, right: 1 };

  it("finds each edge, and nothing in the middle of the screen", () => {
    expect(doorEdgeAt(EDGE_ZONE - 1, 500, 1920, 1080, allDoors)).toBe("left");
    expect(doorEdgeAt(1920 - EDGE_ZONE + 1, 500, 1920, 1080, allDoors)).toBe("right");
    expect(doorEdgeAt(900, EDGE_ZONE - 1, 1920, 1080, allDoors)).toBe("top");
    expect(doorEdgeAt(900, 1080 - EDGE_ZONE + 1, 1920, 1080, allDoors)).toBe("bottom");
    expect(doorEdgeAt(EDGE_ZONE, 500, 1920, 1080, allDoors)).toBeNull();
  });

  it("counts a pointer past the edge, and ignores edges without a door", () => {
    expect(doorEdgeAt(-50, 500, 1920, 1080, allDoors)).toBe("left");
    expect(doorEdgeAt(1915, 500, 1920, 1080, { left: 1 })).toBeNull();
  });

  it("picks the closer edge in a corner, skipping one without a door", () => {
    expect(doorEdgeAt(30, 10, 1920, 1080, allDoors)).toBe("top");
    expect(doorEdgeAt(30, 10, 1920, 1080, { left: 1 })).toBe("left");
  });
});

describe("EdgeDwell", () => {
  it("crosses once the pointer has stayed at the edge long enough", () => {
    const edge = new EdgeDwell(false);
    expect(edge.update("right", 0)).toBeNull();
    expect(edge.update("right", EDGE_DWELL_MS - 1)).toBeNull();
    expect(edge.update("right", EDGE_DWELL_MS)).toBe("right");
  });

  it("restarts the wait when the pointer leaves or changes edge", () => {
    const edge = new EdgeDwell(false);
    edge.update("right", 0);
    edge.update(null, 100);
    expect(edge.update("right", EDGE_DWELL_MS)).toBeNull();
    edge.update("top", EDGE_DWELL_MS + 1);
    expect(edge.update("top", EDGE_DWELL_MS * 2)).toBeNull();
  });

  it("must leave the edge before crossing again", () => {
    const edge = new EdgeDwell(false);
    edge.update("left", 0);
    edge.update("left", EDGE_DWELL_MS);
    expect(edge.update("left", EDGE_DWELL_MS * 5)).toBeNull();
    edge.update(null, EDGE_DWELL_MS * 6);
    edge.update("left", EDGE_DWELL_MS * 7);
    expect(edge.update("left", EDGE_DWELL_MS * 8)).toBe("left");
  });

  it("must leave first when the press began at an edge", () => {
    const edge = new EdgeDwell(true);
    edge.update("right", 0);
    expect(edge.update("right", EDGE_DWELL_MS * 5)).toBeNull();
  });
});

describe("swayAngle", () => {
  it("starts upright and tilts both ways by a small angle", () => {
    expect(swayAngle(0)).toBe(0);
    const angles = Array.from({ length: 600 }, (_, frame) => swayAngle(frame));
    expect(Math.max(...angles)).toBeGreaterThan(0.1);
    expect(Math.min(...angles)).toBeLessThan(-0.1);
    expect(Math.max(...angles.map(Math.abs))).toBeLessThanOrEqual(0.14);
  });
});

describe("getHeldPose", () => {
  const bounds: HoldBounds = { minX: 40, maxX: 1880, minY: 150, floorTop: 360, maxY: 1040 };

  it("hangs above the landing spot when over the floor", () => {
    expect(getHeldPose(500, 600, 16, bounds)).toEqual({ x: 500, y: 584, groundY: 600 });
  });

  it("lands on the top edge of the floor when dropped from above it", () => {
    expect(getHeldPose(500, 200, 16, bounds)).toEqual({ x: 500, y: 184, groundY: 360 });
  });

  it("keeps the walker on screen when the pointer leaves it", () => {
    expect(getHeldPose(-300, -300, 16, bounds)).toEqual({ x: 40, y: 150, groundY: 360 });
    expect(getHeldPose(5000, 5000, 16, bounds)).toEqual({ x: 1880, y: 1040, groundY: 1040 });
  });
});
