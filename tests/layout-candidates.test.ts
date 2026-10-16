import test from "node:test";
import assert from "node:assert/strict";
import { generatePlotLayoutCandidates, generateRectangularLayoutCandidates } from "../lib/layout-candidates";

const requirements = [
  { id: "living", name: "Living", width: 4, depth: 4 },
  { id: "kitchen", name: "Kitchen", width: 3, depth: 3 },
  { id: "bedroom", name: "Bedroom", width: 3, depth: 3 },
];

test("generates three deterministic non-overlapping candidates inside a sufficient rectangle", () => {
  const first = generateRectangularLayoutCandidates(requirements, 7, 7);
  const second = generateRectangularLayoutCandidates(requirements, 7, 7);
  assert.equal(first.length, 3);
  assert.deepEqual(first, second);
  assert.ok(first.every((candidate) => candidate.valid));
  assert.ok(first.every((candidate) => candidate.rooms.length === requirements.length));
  assert.deepEqual(first.map((candidate) => candidate.strategy), ["requested-order", "wide-first", "deep-first"]);
});

test("marks candidates invalid when the room set cannot fit the plot", () => {
  const candidates = generateRectangularLayoutCandidates(requirements, 3, 4);
  assert.equal(candidates.length, 3);
  assert.ok(candidates.every((candidate) => !candidate.valid));
  assert.ok(candidates.some((candidate) => candidate.errors.length > 0));
});

test("rejects malformed, duplicate, or out-of-range room requirements", () => {
  assert.deepEqual(generateRectangularLayoutCandidates([], 10, 10), []);
  assert.deepEqual(generateRectangularLayoutCandidates(requirements, 0, 10), []);
  assert.deepEqual(generateRectangularLayoutCandidates([
    requirements[0], { ...requirements[1], id: requirements[0].id },
  ], 10, 10), []);
  assert.deepEqual(generateRectangularLayoutCandidates([
    { ...requirements[0], width: 0.5 },
  ], 10, 10), []);
});

test("does not mutate caller-provided room requirements", () => {
  const original = JSON.stringify(requirements);
  generateRectangularLayoutCandidates(requirements, 7, 7);
  assert.equal(JSON.stringify(requirements), original);
});


test("checks candidates against the actual saved polygon and keeps a small boundary inset", () => {
  const square = generatePlotLayoutCandidates([
    { id: "living", name: "Living", width: 3, depth: 3 },
    { id: "bedroom", name: "Bedroom", width: 3, depth: 3 },
  ], [[0, 0], [10, 0], [10, 10], [0, 10]]);
  assert.equal(square.length, 3);
  assert.ok(square.every((candidate) => candidate.valid));
  assert.ok(square.every((candidate) => candidate.rooms.every((room) => room.x >= 0.1 && room.y >= 0.1)));

  const triangle = generatePlotLayoutCandidates([
    { id: "room", name: "Large room", width: 7, depth: 7 },
  ], [[0, 0], [10, 0], [0, 10]]);
  assert.equal(triangle.length, 3);
  assert.ok(triangle.every((candidate) => !candidate.valid));
  assert.ok(triangle.every((candidate) => candidate.errors.some((error) => error.includes("plot boundary"))));
});
