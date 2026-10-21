import test from "node:test";
import assert from "node:assert/strict";
import { projectGpsToLocal } from "../lib/gps-projection";
import { buildGpsCandidate, checkPendingGpsCandidate, classifyGpsAccuracy, isGpsCandidateEligible, MAX_PLOT_VERTICES } from "../lib/gps-capture";

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
  assert.throws(() => projectGpsToLocal({ latitude: Number.NaN, longitude: 0 }, 0, 0), /finite latitude\/longitude/);
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

test("invalid first GPS fix with acceptable accuracy creates no candidate", () => {
  const result = buildGpsCandidate({ latitude: 91, longitude: 0, accuracy: 5 }, null);
  assert.deepEqual(result, { ok: false, reason: "coordinates" });
});

test("invalid later GPS fix with acceptable accuracy creates no candidate and preserves origin", () => {
  const existingOrigin = { latitude: 16, longitude: 80 };
  const result = buildGpsCandidate({ latitude: 91, longitude: 0, accuracy: 5 }, existingOrigin);
  assert.deepEqual(result, { ok: false, reason: "coordinates" });
  assert.deepEqual(existingOrigin, { latitude: 16, longitude: 80 });
});

test("valid first and later GPS fixes produce candidates only when coordinates and accuracy are valid", () => {
  const first = buildGpsCandidate({ latitude: 16, longitude: 80, accuracy: 5 }, null);
  assert.equal(first.ok, true);
  if (first.ok) {
    assert.equal(first.candidate.first, true);
    assert.deepEqual(first.candidate.point, [0, 0]);
  }

  const later = buildGpsCandidate({ latitude: 16.0001, longitude: 80, accuracy: 10 }, { latitude: 16, longitude: 80 });
  assert.equal(later.ok, true);
  if (later.ok) assert.equal(later.candidate.first, false);
});

test("invalid accuracy never produces a GPS candidate", () => {
  const result = buildGpsCandidate({ latitude: 16, longitude: 80, accuracy: 10.0001 }, null);
  assert.deepEqual(result, { ok: false, reason: "accuracy" });
});

const ORIGIN_A = { latitude: 16, longitude: 80 };
const firstCandidate = { point: [0, 0] as [number, number], origin: ORIGIN_A, accuracy: 5, first: true };
const laterCandidate = { point: [3, 4] as [number, number], origin: ORIGIN_A, accuracy: 5, first: false };
test("pending first-fix guard checks origin and editor snapshot", () => {
  assert.deepEqual(checkPendingGpsCandidate(firstCandidate, null, 4), { ok: true });
  assert.deepEqual(checkPendingGpsCandidate(firstCandidate, ORIGIN_A, 4), { ok: false, reason: "stale-origin" });
  assert.deepEqual(checkPendingGpsCandidate(firstCandidate, null, 4, false), { ok: false, reason: "stale-origin" });
});
test("pending later point is valid only against the same origin", () => {
  assert.deepEqual(checkPendingGpsCandidate(laterCandidate, ORIGIN_A, 5), { ok: true });
  assert.deepEqual(checkPendingGpsCandidate(laterCandidate, { ...ORIGIN_A }, 5), { ok: true });
  assert.deepEqual(checkPendingGpsCandidate(laterCandidate, null, 5), { ok: false, reason: "stale-origin" });
  assert.deepEqual(checkPendingGpsCandidate(laterCandidate, { latitude: 17, longitude: 80 }, 5), { ok: false, reason: "stale-origin" });
  assert.deepEqual(checkPendingGpsCandidate(laterCandidate, { latitude: 16, longitude: 81 }, 5), { ok: false, reason: "stale-origin" });
});
test("pending later point enforces vertex limit", () => {
  assert.deepEqual(checkPendingGpsCandidate(laterCandidate, ORIGIN_A, MAX_PLOT_VERTICES - 1), { ok: true });
  assert.deepEqual(checkPendingGpsCandidate(laterCandidate, ORIGIN_A, MAX_PLOT_VERTICES), { ok: false, reason: "vertex-limit" });
  assert.deepEqual(checkPendingGpsCandidate(laterCandidate, ORIGIN_A, MAX_PLOT_VERTICES + 5), { ok: false, reason: "vertex-limit" });
});
test("confirm-time check does not mutate inputs", () => {
  const c = Object.freeze({ ...laterCandidate }), o = Object.freeze({ ...ORIGIN_A });
  checkPendingGpsCandidate(c, o, 5);
  assert.deepEqual(c, laterCandidate); assert.deepEqual(o, ORIGIN_A);
});
const GOOD_ORIGIN = { latitude: 17.385, longitude: 78.4867 };
const badCoords: Array<[string, unknown, unknown]> = [
  ["latitude 91", 91, 0], ["latitude -91", -91, 0], ["longitude 181", 0, 181], ["longitude -181", 0, -181],
  ["NaN latitude", NaN, 0], ["Infinity longitude", 0, Infinity], ["-Infinity latitude", -Infinity, 0],
  ["numeric-string latitude", "17.3", 78.4], ["undefined latitude", undefined, 78.4], ["null longitude", 17.3, null],
];
for (const [label, latitude, longitude] of badCoords) for (const [when, origin] of [["first fix", null], ["later fix", GOOD_ORIGIN]] as const) {
  test(`MATRIX ${when} with good accuracy but ${label} creates no candidate`, () => {
    const r = buildGpsCandidate({ latitude, longitude, accuracy: 5 } as never, origin);
    assert.equal(r.ok, false); if (!r.ok) assert.equal(r.reason, "coordinates");
  });
}
test("MATRIX accuracy 10 accepted; worse/invalid rejected for first and later fixes", () => {
  for (const origin of [null, GOOD_ORIGIN]) {
    const base = { latitude: 17.3851, longitude: 78.4868 };
    assert.equal(buildGpsCandidate({ ...base, accuracy: 10 }, origin).ok, true);
    for (const accuracy of [10.01, 15, 50, 0, -1, NaN, Infinity, undefined, null, "5"]) {
      const r = buildGpsCandidate({ ...base, accuracy } as never, origin);
      assert.equal(r.ok, false, `accuracy ${String(accuracy)}`); if (!r.ok) assert.equal(r.reason, "accuracy");
    }
  }
});
test("MATRIX invalid stored origin never yields a candidate", () => {
  assert.equal(buildGpsCandidate({ latitude: 17.3, longitude: 78.4, accuracy: 5 }, { latitude: 999, longitude: 0 }).ok, false);
});
test("MATRIX inputs are not mutated and first-fix origin is echoed unchanged", () => {
  const fix = Object.freeze({ latitude: 17.38512345678, longitude: 78.48671234567, accuracy: 8 });
  const r = buildGpsCandidate(fix, null); assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.candidate.origin, { latitude: 17.38512345678, longitude: 78.48671234567 });
});
test("MATRIX accuracy takes precedence over invalid coordinates", () => {
  assert.deepEqual(buildGpsCandidate({ latitude: 91, longitude: 0, accuracy: 50 }, null), { ok: false, reason: "accuracy" });
});
