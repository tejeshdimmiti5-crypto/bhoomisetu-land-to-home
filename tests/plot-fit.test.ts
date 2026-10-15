import test from "node:test";
import assert from "node:assert/strict";
import { checkFloorPlanFitsPlot } from "../lib/plot-fit";
import type { FloorPlanRoom } from "../lib/floor-plan";
import type { Ring } from "../lib/geometry";

const square: Ring = [[0, 0], [12, 0], [12, 10], [0, 10]];
const room = (overrides: Partial<FloorPlanRoom> = {}): FloorPlanRoom => ({
  id: "living", name: "Living", x: 1, y: 1, width: 4, depth: 3, ...overrides,
});

test("room layout fully inside a rectangular plot fits", () => {
  const result = checkFloorPlanFitsPlot(square, [room()]);
  assert.equal(result.fits, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.plotBounds, { minX: 0, minY: 0, width: 12, depth: 10 });
});

test("plot coordinates can be negative; layout aligns to bounding-box minimum", () => {
  const ring: Ring = [[-10, -5], [2, -5], [2, 5], [-10, 5]];
  const result = checkFloorPlanFitsPlot(ring, [room()]);
  assert.equal(result.fits, true);
  assert.deepEqual(result.plotBounds, { minX: -10, minY: -5, width: 12, depth: 10 });
});

test("layout larger than the plot bounding box is rejected", () => {
  const result = checkFloorPlanFitsPlot(square, [room({ x: 1, width: 12 })]);
  assert.equal(result.fits, false);
  assert.ok(result.errors.some((error) => error.includes("bounding-box")));
});

test("room touching the plot boundary is rejected", () => {
  const result = checkFloorPlanFitsPlot(square, [room({ x: 0 })]);
  assert.equal(result.fits, false);
  assert.ok(result.errors.some((error) => error.includes("inside the plot")));
});

test("concave polygon containment rejects a room that crosses a notch", () => {
  const concave: Ring = [[0, 0], [10, 0], [10, 10], [6, 10], [6, 4], [4, 4], [4, 10], [0, 10]];
  const result = checkFloorPlanFitsPlot(concave, [room({ x: 2, y: 5, width: 6, depth: 2 })]);
  assert.equal(result.fits, false);
  assert.ok(result.errors.some((error) => error.includes("inside the plot") || error.includes("crosses")));
});

test("missing plot boundary or rooms is rejected safely", () => {
  assert.equal(checkFloorPlanFitsPlot([], [room()]).fits, false);
  assert.equal(checkFloorPlanFitsPlot(square, []).fits, false);
});
