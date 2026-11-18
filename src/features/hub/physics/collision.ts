/**
 * Hub collision
 * Axis-aligned boxes around each walker (body + head). Overlapping boxes are pushed apart
 * along the axis of least penetration and the walkers bounce off that axis.
 * Pure functions: no Pixi, so it is unit-tested directly.
 */

export interface CollisionBox {
  /** Centre of the box. */
  x: number;
  y: number;
  halfWidth: number;
  halfHeight: number;
  /** Static boxes (e.g. a walker mid-interaction) push others but never move. */
  isStatic?: boolean;
}

export interface Contact {
  a: number;
  b: number;
  /** Unit normal pointing from a to b, along a single axis. */
  normalX: number;
  normalY: number;
  /** Penetration depth along the normal. */
  depth: number;
}

/** Returns the contact between two boxes, or null when they do not overlap. */
export function getContact(
  boxA: CollisionBox,
  boxB: CollisionBox,
  a = 0,
  b = 1,
): Contact | null {
  const dx = boxB.x - boxA.x;
  const dy = boxB.y - boxA.y;
  const overlapX = boxA.halfWidth + boxB.halfWidth - Math.abs(dx);
  const overlapY = boxA.halfHeight + boxB.halfHeight - Math.abs(dy);
  if (overlapX <= 0 || overlapY <= 0) return null;

  // Exactly stacked boxes have no direction; pick one so they still separate.
  if (overlapX < overlapY) {
    return { a, b, normalX: dx < 0 ? -1 : 1, normalY: 0, depth: overlapX };
  }
  return { a, b, normalX: 0, normalY: dy < 0 ? -1 : 1, depth: overlapY };
}

/**
 * All overlapping pairs. O(n²), which is fine for the tens of walkers in a room;
 * swap in a spatial hash here if rooms grow to hundreds.
 */
export function findContacts(boxes: CollisionBox[]): Contact[] {
  const contacts: Contact[] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxes[i].isStatic && boxes[j].isStatic) continue;
      const contact = getContact(boxes[i], boxes[j], i, j);
      if (contact) contacts.push(contact);
    }
  }
  return contacts;
}

/** Moves boxes in place so the given contacts no longer overlap. */
export function separate(boxes: CollisionBox[], contacts: Contact[]): void {
  for (const { a, b, normalX, normalY, depth } of contacts) {
    const boxA = boxes[a];
    const boxB = boxes[b];
    const shareA = boxA.isStatic ? 0 : boxB.isStatic ? 1 : 0.5;
    const shareB = 1 - shareA;
    boxA.x -= normalX * depth * shareA;
    boxA.y -= normalY * depth * shareA;
    boxB.x += normalX * depth * shareB;
    boxB.y += normalY * depth * shareB;
  }
}

/**
 * Reflects a heading (radians) so it points away from a wall with the given normal.
 * Headings already moving away are returned unchanged, so a bounce never sticks.
 */
export function bounceAngle(angle: number, normalX: number, normalY: number): number {
  const vx = Math.cos(angle);
  const vy = Math.sin(angle);
  if (vx * normalX + vy * normalY >= 0) return angle;
  return normalX !== 0 ? Math.PI - angle : -angle;
}

/** True when `box` overlaps any of `others`; used to find a free spawn spot. */
export function overlapsAny(box: CollisionBox, others: CollisionBox[]): boolean {
  return others.some((other) => getContact(box, other) !== null);
}
