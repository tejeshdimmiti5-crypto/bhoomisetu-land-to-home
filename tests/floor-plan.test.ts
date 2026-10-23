import test from "node:test";
import assert from "node:assert/strict";
import { buildFloorPlanAnnotations, formatMetricDimension, formatRoomDimensionLabel, roomsOverlap, validateFloorPlanRooms, type FloorPlanRoom } from "../lib/floor-plan";

const rooms: FloorPlanRoom[] = [
  { id: "living", name: "Living", x: 0, y: 0, width: 5, depth: 4 },
  { id: "bedroom", name: "Bedroom", x: 5, y: 0, width: 3, depth: 4 },
  { id: "kitchen", name: "Kitchen", x: 0, y: 4, width: 3, depth: 3 },
];

test("valid adjacent room rectangles do not count as overlapping", () => {
  assert.equal(roomsOverlap(rooms[0], rooms[1]), false);
  const result = validateFloorPlanRooms(rooms);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.bounds, { width: 8, depth: 7 });
  assert.equal(result.totalRoomAreaM2, 41);
  assert.deepEqual(result.overlappingRoomIds, []);
});

test("positive-area intersection identifies both overlapping rooms", () => {
  const result = validateFloorPlanRooms([
    rooms[0],
    { ...rooms[1], x: 4.5 },
  ]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("overlap")));
  assert.deepEqual(result.overlappingRoomIds, ["bedroom", "living"]);
});

test("invalid room names, IDs, coordinates and dimensions are rejected", () => {
  const result = validateFloorPlanRooms([
    { id: "dup", name: " ", x: 0, y: 0, width: 0, depth: 3 },
    { id: "dup", name: "Second", x: Number.NaN, y: 0, width: 3, depth: 3 },
  ]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("Duplicate room ID")));
  assert.ok(result.errors.some((error) => error.includes("needs a name")));
  assert.ok(result.errors.some((error) => error.includes("finite numbers")));
  assert.ok(result.errors.some((error) => error.includes("width and depth")));
});

test("empty and over-limit plans are rejected", () => {
  assert.equal(validateFloorPlanRooms([]).valid, false);
  const many = Array.from({ length: 41 }, (_, i) => ({
    id: String(i), name: "Room", x: 0, y: 0, width: 1, depth: 1,
  }));
  const result = validateFloorPlanRooms(many);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("at most 40 rooms")));
});

test("non-array input is rejected safely", () => {
  const result = validateFloorPlanRooms({ rooms: [] });
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ["Rooms must be an array."]);
});

test("dimension helpers format metric values and room labels from actual geometry", () => {
  assert.equal(formatMetricDimension(8.5), "8.50 m");
  assert.equal(formatRoomDimensionLabel({ name: "Bedroom 1", width: 3.5, depth: 4 }), "Bedroom 1: 3.50 m × 4.00 m");

  const annotations = buildFloorPlanAnnotations(rooms);
  assert.equal(annotations.valid, true);
  assert.equal(annotations.overallLabel, "8.00 m × 7.00 m");
  assert.deepEqual(annotations.roomLabels.map((room) => room.label), [
    "Living: 5.00 m × 4.00 m",
    "Bedroom: 3.00 m × 4.00 m",
    "Kitchen: 3.00 m × 3.00 m",
  ]);
});

test("buildFloorPlanAnnotations rejects invalid or incomplete room geometry", () => {
  const result = buildFloorPlanAnnotations([
    { id: "bad", name: " ", x: 0, y: 0, width: 0, depth: 3 },
  ] as unknown as FloorPlanRoom[]);
  assert.equal(result.valid, false);
  assert.equal(result.overallLabel, "Unavailable");
  assert.deepEqual(result.roomLabels, []);
  assert.ok(result.errors.length > 0);
});
