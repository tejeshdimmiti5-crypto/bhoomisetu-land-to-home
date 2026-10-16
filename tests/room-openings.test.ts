import test from "node:test";
import assert from "node:assert/strict";
import { validateRoomOpenings, type RoomOpening } from "../lib/room-openings";
import type { FloorPlanRoom } from "../lib/floor-plan";

const rooms: FloorPlanRoom[] = [
  { id: "living", name: "Living", x: 0, y: 0, width: 5, depth: 4 },
];

const opening = (overrides: Partial<RoomOpening> = {}): RoomOpening => ({
  id: "front-door",
  roomId: "living",
  kind: "door",
  wall: "south",
  offsetM: 1,
  widthM: 0.9,
  ...overrides,
});

test("accepts a door contained within a room wall", () => {
  assert.deepEqual(validateRoomOpenings(rooms, [opening()]), { valid: true, errors: [] });
});

test("accepts a window and an opening that ends exactly at the wall edge", () => {
  assert.equal(validateRoomOpenings(rooms, [
    opening({ id: "window", kind: "window", wall: "north", offsetM: 3, widthM: 2 }),
  ]).valid, true);
});

test("rejects an opening extending past the wall", () => {
  const result = validateRoomOpenings(rooms, [opening({ offsetM: 4.2, widthM: 1 })]);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /extends beyond/);
});

test("rejects overlapping openings on the same room wall", () => {
  const result = validateRoomOpenings(rooms, [
    opening({ id: "door-a", offsetM: 0.5, widthM: 1.2 }),
    opening({ id: "door-b", offsetM: 1.5, widthM: 1 }),
  ]);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /overlaps opening/);
});

test("allows openings on different walls at the same offset", () => {
  assert.equal(validateRoomOpenings(rooms, [
    opening({ id: "north-window", kind: "window", wall: "north" }),
    opening({ id: "south-door", wall: "south" }),
  ]).valid, true);
});

test("rejects unknown rooms, duplicate IDs, invalid kinds, and non-finite measurements", () => {
  const result = validateRoomOpenings(rooms, [
    opening({ id: "same", roomId: "missing" }),
    opening({ id: "same", kind: "skylight" as "door", offsetM: Number.NaN }),
  ]);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /unknown room/);
  assert.match(result.errors.join(" "), /Duplicate opening ID/);
  assert.match(result.errors.join(" "), /kind must be door or window/);
  assert.match(result.errors.join(" "), /offset must be a finite/);
});
