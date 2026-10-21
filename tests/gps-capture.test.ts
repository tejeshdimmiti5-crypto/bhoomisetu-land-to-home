import test from "node:test";
import assert from "node:assert/strict";
import { projectGpsToLocal } from "../lib/gps-projection";
import { classifyGpsAccuracy, isGpsCandidateEligible } from "../lib/gps-capture";

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

test("GPS projection rejects invalid coordinates in either the origin or the fix", () => {
  assert.throws(() => projectGpsToLocal({ latitude: 91, longitude: 0 }, 0, 0), /finite latitude\/longitude/);
  assert.throws(() => projectGpsToLocal({ latitude: 0, longitude: 0 }, Number.NaN, 0), /finite latitude\/longitude/);
  assert.throws(() => projectGpsToLocal({ latitude: Number.NaN, longitude: 0 }, Number.NaN, 0), /finite latitude\/longitude/);
});

const accuracyCases: Array<[number, "invalid" | "acceptable" | "rejected"]> = [
  [-1, "invalid"],
  [0, "invalid"],
  [-0, "invalid"],
  [Number.NaN, "invalid"],
  [Number.POSITIVE_INFINITY, "invalid"],
  [Number.NEGATIVE_INFINITY, "invalid"],
  [5, "acceptable"],
  [10, "acceptable"],
  [10.0001, "rejected"],
  [15, "rejected"],
  [49.9999, "rejected"],
  [50, "rejected"],
  [50.0001, "rejected"],
];

for (const [value, expected] of accuracyCases) {
  const name = Object.is(value, -0) ? "-0" : String(value);
  test(`classifies GPS accuracy ${name} as ${expected}`, () => {
    assert.equal(classifyGpsAccuracy(value), expected);
  });
}

test("every returned GPS accuracy class belongs to the allowed set", () => {
  const allowed = new Set(["invalid", "acceptable", "rejected"]);
  for (const value of [-1, 0, 5, 10, 50, 51, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.ok(allowed.has(classifyGpsAccuracy(value)));
  }
});

test("only acceptable GPS accuracy classes are eligible for a candidate", () => {
  assert.equal(isGpsCandidateEligible("acceptable"), true);
  assert.equal(isGpsCandidateEligible("rejected"), false);
  assert.equal(isGpsCandidateEligible("invalid"), false);
});

test("10.0001 m is rejected and ineligible for a GPS candidate", () => {
  const classification = classifyGpsAccuracy(10.0001);
  assert.equal(classification, "rejected");
  assert.equal(isGpsCandidateEligible(classification), false);
});

test("10 m is accepted and eligible for a GPS candidate", () => {
  const classification = classifyGpsAccuracy(10);
  assert.equal(classification, "acceptable");
  assert.equal(isGpsCandidateEligible(classification), true);
});

test("missing and numeric-string accuracy values are invalid without coercion", () => {
  assert.equal(classifyGpsAccuracy(undefined as unknown as number), "invalid");
  assert.equal(classifyGpsAccuracy("10" as unknown as number), "invalid");
});
