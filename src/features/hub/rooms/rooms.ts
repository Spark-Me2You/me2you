/**
 * Hub rooms
 * The hub is a small "house": the main spark room plus one room behind each of its four doors.
 * Every walker lives in exactly one room, chosen deterministically from its owner id so a
 * person is always found in the same place (visitors have to go looking for them).
 */

export type DoorSide = "top" | "bottom" | "left" | "right";

export type RoomId = "main" | "north" | "south" | "west" | "east";

export interface RoomConfig {
  id: RoomId;
  /** Lowercase brand-voice label shown on the door that leads here. */
  label: string;
  /** Background image under `public/`. */
  background: string;
  /** Pixi tint for the background; placeholder until each room gets its own art. */
  tint: number;
  /** Relative share of walkers placed in this room (see `assignRoom`). */
  weight: number;
  /** Doors drawn in this room and the room each one leads to. */
  doors: Partial<Record<DoorSide, RoomId>>;
}

export const MAIN_ROOM: RoomId = "main";

export const ROOMS: Record<RoomId, RoomConfig> = {
  main: {
    id: "main",
    label: "spark",
    background: "/bg_draft1.png",
    tint: 0xffffff,
    weight: 2,
    doors: { top: "north", bottom: "south", left: "west", right: "east" },
  },
  north: {
    id: "north",
    label: "loft",
    background: "/bg_draft1.png",
    tint: 0xd8f6ff,
    weight: 1,
    doors: { bottom: "main" },
  },
  south: {
    id: "south",
    label: "garden",
    background: "/bg_draft1.png",
    tint: 0xe9ffd0,
    weight: 1,
    doors: { top: "main" },
  },
  west: {
    id: "west",
    label: "lounge",
    background: "/bg_draft1.png",
    tint: 0xffe0f4,
    weight: 1,
    doors: { right: "main" },
  },
  east: {
    id: "east",
    label: "studio",
    background: "/bg_draft1.png",
    tint: 0xffe6d6,
    weight: 1,
    doors: { left: "main" },
  },
};

export const ROOM_IDS = Object.keys(ROOMS) as RoomId[];

/** FNV-1a: small, stable string hash (same id → same room across sessions and kiosks). */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Pick a room for a walker, weighted by `RoomConfig.weight`. */
export function assignRoom(
  ownerId: string,
  rooms: Record<RoomId, RoomConfig> = ROOMS,
): RoomId {
  const ids = Object.keys(rooms) as RoomId[];
  const total = ids.reduce((sum, id) => sum + rooms[id].weight, 0);
  if (total <= 0) return MAIN_ROOM;

  let slot = hashString(ownerId) % total;
  for (const id of ids) {
    slot -= rooms[id].weight;
    if (slot < 0) return id;
  }
  return MAIN_ROOM;
}
