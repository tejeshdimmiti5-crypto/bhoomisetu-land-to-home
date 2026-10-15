import test from "node:test";
import assert from "node:assert/strict";
import { measurePolygon } from "../lib/geometry";

test("measures a 10 m by 5 m rectangle from canonical coordinates", () => {
  const result = measurePolygon([[0, 0], [10, 0], [10, 5], [0, 5]]);
  assert.equal(result.areaM2, 50);
  assert.equal(result.perimeterM, 30);
  assert.equal(result.vertexCount, 4);
});

test("accepts reversed winding with the same measurements", () => {
  const result = measurePolygon([[0, 5], [10, 5], [10, 0], [0, 0]]);
  assert.equal(result.areaM2, 50);
  assert.equal(result.perimeterM, 30);
});

test("quantizes stored coordinates to millimetres before measuring", () => {
  const result = measurePolygon([[0.0004, 0], [2.0004, 0], [2.0004, 1], [0.0004, 1]]);
  assert.deepEqual(result.ring, [[0, 0], [2, 0], [2, 1], [0, 1]]);
  assert.equal(result.areaM2, 2);
});

test("rejects points with three coordinates", () => {
  assert.throws(() => measurePolygon([[0, 0, 9], [1, 0], [0, 1]]), /exactly \[x, y\]/);
});

test("rejects boolean coordinates", () => {
  assert.throws(() => measurePolygon([[false, 0], [1, 0], [0, 1]]), /finite numbers/);
});

test("rejects NaN and Infinity", () => {
  assert.throws(() => measurePolygon([[0, 0], [Infinity, 0], [0, 1]]), /finite numbers/);
  assert.throws(() => measurePolygon([[0, 0], [NaN, 0], [0, 1]]), /finite numbers/);
});

test("rejects a closed ring instead of silently normalizing it", () => {
  assert.throws(() => measurePolygon([[0, 0], [2, 0], [2, 2], [0, 0]]), /Ring must be open/);
});

test("rejects sliver polygons below the area floor", () => {
  assert.throws(() => measurePolygon([[0, 0], [10, 0], [10, 0.001], [0, 0.001]]), /effective width must be at least/);
});

test("rejects a self-intersecting bow-tie", () => {
  assert.throws(() => measurePolygon([[0, 0], [2, 2], [0, 2], [2, 0]]), /intersect or touch/);
});

test("rejects duplicate adjacent vertices", () => {
  assert.throws(() => measurePolygon([[0, 0], [2, 0], [2, 0], [0, 2]]), /collapse after quantization/);
});

test("rejects collinear / zero-area polygons", () => {
  assert.throws(() => measurePolygon([[0, 0], [1, 0], [2, 0]]), /area must be at least/);
});

test("rejects too few vertices", () => {
  assert.throws(() => measurePolygon([[0, 0], [1, 0]]), /at least three/);
});
