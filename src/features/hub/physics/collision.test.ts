import { describe, expect, it } from "vitest";
import {
  bounceAngle,
  findContacts,
  getContact,
  overlapsAny,
  separate,
  type CollisionBox,
} from "./collision";

const box = (x: number, y: number, isStatic = false): CollisionBox => ({
  x,
  y,
  halfWidth: 10,
  halfHeight: 20,
  isStatic,
});

describe("getContact", () => {
  it("returns null for boxes that only touch or are apart", () => {
    expect(getContact(box(0, 0), box(20, 0))).toBeNull();
    expect(getContact(box(0, 0), box(0, 50))).toBeNull();
  });

  it("uses the axis of least penetration", () => {
    expect(getContact(box(0, 0), box(15, 5))).toMatchObject({ normalX: 1, normalY: 0, depth: 5 });
    expect(getContact(box(0, 0), box(2, -35))).toMatchObject({ normalX: 0, normalY: -1, depth: 5 });
  });

  it("still separates exactly stacked boxes", () => {
    expect(getContact(box(0, 0), box(0, 0))?.depth).toBe(20);
  });
});

describe("findContacts + separate", () => {
  it("splits the push between two moving boxes", () => {
    const boxes = [box(0, 0), box(16, 0)];
    separate(boxes, findContacts(boxes));
    expect(boxes[0].x).toBe(-2);
    expect(boxes[1].x).toBe(18);
    expect(findContacts(boxes)).toHaveLength(0);
  });

  it("never moves a static box", () => {
    const boxes = [box(0, 0, true), box(16, 0)];
    separate(boxes, findContacts(boxes));
    expect(boxes[0].x).toBe(0);
    expect(boxes[1].x).toBe(20);
  });

  it("ignores pairs of static boxes", () => {
    expect(findContacts([box(0, 0, true), box(1, 0, true)])).toHaveLength(0);
  });
});

describe("overlapsAny", () => {
  it("detects an overlap against any box in the list", () => {
    expect(overlapsAny(box(0, 0), [box(100, 0), box(5, 5)])).toBe(true);
    expect(overlapsAny(box(0, 0), [box(100, 0)])).toBe(false);
  });
});

describe("bounceAngle", () => {
  it("reflects a heading into the obstacle", () => {
    // Moving right into a wall whose normal points left.
    expect(Math.cos(bounceAngle(0, -1, 0))).toBeCloseTo(-1);
    // Moving down into something below (normal points up).
    expect(Math.sin(bounceAngle(Math.PI / 2, 0, -1))).toBeCloseTo(-1);
  });

  it("leaves a heading that already points away", () => {
    expect(bounceAngle(Math.PI, -1, 0)).toBe(Math.PI);
  });
});
