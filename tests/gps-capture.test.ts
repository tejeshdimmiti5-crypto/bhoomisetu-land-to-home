import test from "node:test";
import assert from "node:assert/strict";
import { projectGpsToLocal } from "../lib/gps-projection";
import { classifyGpsAccuracy } from "../lib/gps-capture";

function assertClose(actual: number, expected: number, tolerance = 0.1): void {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected} +/- ${tolerance}, got ${actual}`);
}

test("GPS origin projects to local zero", () => {
  assert.deepEqual(projectGpsToLocal({ latitude: 16.0, longitude: 80.0 }, 16.0, 80.0), [0, 0]);
});

test("GPS projection converts small latitude and longitude changes to metres", () => {
  const origin = { latitude: 0, longitude: 0 };
  const north = projectGpsToLocal(origin, 0.001, 0);
  const east = projectGpsToLocal(origin, 0, 0.001);
  assertClose(north[1], 111.195, 0.2);
  assertClose(north[0], 0, 0.001);
  assertClose(east[0], 111.195, 0.2);
  assertClose(east[1], 0, 0.001);
});

test("GPS projection handles longitude wrap across the antimeridian", () => {
  const east = projectGpsToLocal({ latitude: 0, longitude: 179.999 }, 0, -179.999);
  assertClose(east[0], 222.39, 0.5);
});

test("GPS projection rejects invalid coordinates", () => {
  assert.throws(() => projectGpsToLocal({ latitude: 91, longitude: 0 }, 0, 0), /finite latitude\/longitude/);
  assert.throws(() => projectGpsToLocal({ latitude: 0, longitude: 0 }, Number.NaN, 0), /finite latitude\/longitude/);
});

test("GPS accuracy policy rejects invalid and very imprecise fixes", () => {
  assert.equal(classifyGpsAccuracy(Number.NaN), "invalid");
  assert.equal(classifyGpsAccuracy(-1), "invalid");
  assert.equal(classifyGpsAccuracy(50.01), "rejected");
});

test("GPS accuracy policy warns above 10 metres and accepts up to 10 metres", () => {
  assert.equal(classifyGpsAccuracy(10), "acceptable");
  assert.equal(classifyGpsAccuracy(10.01), "warning");
  assert.equal(classifyGpsAccuracy(50), "warning");
});
