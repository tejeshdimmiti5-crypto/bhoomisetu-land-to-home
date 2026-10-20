import test from "node:test";
import assert from "node:assert/strict";
import {
  AREA_UNIT_DEFINITION_VERSION,
  AREA_UNIT_FACTORS_M2,
  areaToSquareMetres,
  convertArea,
} from "../lib/units";

/** Compare computed floating-point results without requiring bit-for-bit equality. */
function assertClose(actual: number, expected: number, tolerance = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${expected} +/- ${tolerance}, got ${actual}`,
  );
}

test("area definitions are versioned and exact square-unit factors are documented", () => {
  assert.equal(AREA_UNIT_DEFINITION_VERSION, "bhoomisetu-area-units-v1");
  assert.equal(AREA_UNIT_FACTORS_M2.ft2, 0.09290304);
  assert.equal(AREA_UNIT_FACTORS_M2.yd2, 0.83612736);
  assert.equal(AREA_UNIT_FACTORS_M2.acre, 4046.8564224);
});

test("cent and gunta use the declared acre fractions", () => {
  assertClose(AREA_UNIT_FACTORS_M2.cent, AREA_UNIT_FACTORS_M2.acre / 100);
  assertClose(AREA_UNIT_FACTORS_M2.gunta, AREA_UNIT_FACTORS_M2.acre / 40);
  assertClose(convertArea(1, "gunta", "ft2"), 1089);
  assertClose(convertArea(1, "gunta", "yd2"), 121);
  assertClose(convertArea(1, "acre", "cent"), 100);
  assertClose(convertArea(1, "acre", "gunta"), 40);
});

test("conversions round-trip without display rounding", () => {
  const squareMetres = areaToSquareMetres(150, "yd2");
  assertClose(convertArea(convertArea(150, "yd2", "ft2"), "ft2", "yd2"), 150, 1e-10);
  assertClose(convertArea(squareMetres, "m2", "yd2"), 150, 1e-10);
});

test("rejects negative and non-finite areas", () => {
  assert.throws(() => convertArea(-1, "m2", "ft2"), /finite, non-negative/);
  assert.throws(() => convertArea(Number.NaN, "m2", "ft2"), /finite, non-negative/);
  assert.throws(() => areaToSquareMetres(Infinity, "acre"), /finite, non-negative/);
});
