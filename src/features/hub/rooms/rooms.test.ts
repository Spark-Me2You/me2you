import { describe, expect, it } from "vitest";
import { MAIN_ROOM, ROOMS, ROOM_IDS, assignRoom, hashString, type RoomConfig, type RoomId } from "./rooms";

describe("hashString", () => {
  it("is stable and spreads different ids", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });
});

describe("assignRoom", () => {
  it("always puts the same owner in the same room", () => {
    expect(assignRoom("owner-1")).toBe(assignRoom("owner-1"));
  });

  it("uses every room and roughly follows the weights", () => {
    const counts = Object.fromEntries(ROOM_IDS.map((id) => [id, 0])) as Record<RoomId, number>;
    for (let i = 0; i < 6000; i++) counts[assignRoom(`user-${i}`)]++;

    const totalWeight = ROOM_IDS.reduce((sum, id) => sum + ROOMS[id].weight, 0);
    for (const id of ROOM_IDS) {
      const expected = (6000 * ROOMS[id].weight) / totalWeight;
      expect(counts[id]).toBeGreaterThan(expected * 0.8);
      expect(counts[id]).toBeLessThan(expected * 1.2);
    }
  });

  it("skips zero-weight rooms and falls back to main when all are empty", () => {
    const onlyEast = Object.fromEntries(
      ROOM_IDS.map((id) => [id, { ...ROOMS[id], weight: id === "east" ? 1 : 0 }]),
    ) as Record<RoomId, RoomConfig>;
    expect(assignRoom("anyone", onlyEast)).toBe("east");

    const none = Object.fromEntries(
      ROOM_IDS.map((id) => [id, { ...ROOMS[id], weight: 0 }]),
    ) as Record<RoomId, RoomConfig>;
    expect(assignRoom("anyone", none)).toBe(MAIN_ROOM);
  });
});

describe("ROOMS doors", () => {
  it("main has a door on every side and every side room leads back to main", () => {
    expect(Object.keys(ROOMS.main.doors).sort()).toEqual(["bottom", "left", "right", "top"]);
    for (const target of Object.values(ROOMS.main.doors)) {
      expect(Object.values(ROOMS[target].doors)).toEqual([MAIN_ROOM]);
    }
  });
});
