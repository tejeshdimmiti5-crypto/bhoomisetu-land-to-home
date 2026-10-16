import test from "node:test";
import assert from "node:assert/strict";
import {
  AREA_UNIT_DEFINITION_VERSION,
  AREA_UNIT_FACTORS_M2,
  areaToSquareMetres,
  convertArea,
} from "../lib/units";

test("area definitions are versioned and exact square-unit factors are documented", () => {
  assert.equal(AREA_UNIT_DEFINITION_VERSION, "bhoomisetu-area-units-v1");
  assert.equal(AREA_UNIT_FACTORS_M2.ft2, 0.09290304);
  assert.equal(AREA_UNIT_FACTORS_M2.yd2, 0.83612736);
  assert.equal(AREA_UNIT_FACTORS_M2.acre, 4046.8564224);
});

test("cent and gunta use the declared acre fractions", () => {
  assert.equal(AREA_UNIT_FACTORS_M2.cent, AREA_UNIT_FACTORS_M2.acre / 100);
  assert.equal(AREA_UNIT_FACTORS_M2.gunta, AREA_UNIT_FACTORS_M2.acre / 40);
  assert.equal(convertArea(1, "gunta", "ft2"), 1089);
  assert.equal(convertArea(1, "gunta", "yd2"), 121);
  assert.equal(convertArea(1, "acre", "cent"), 100);
  assert.equal(convertArea(1, "acre", "gunta"), 40);
});

test("conversions round-trip without display rounding", () => {
  const squareMetres = areaToSquareMetres(150, "yd2");
  assert.ok(Math.abs(convertArea(convertArea(150, "yd2", "ft2"), "ft2", "yd2") - 150) < 1e-10);
  assert.ok(Math.abs(convertArea(squareMetres, "m2", "yd2") - 150) < 1e-10);
});

test("rejects negative and non-finite areas", () => {
  assert.throws(() => convertArea(-1, "m2", "ft2"), /finite, non-negative/);
  assert.throws(() => convertArea(Number.NaN, "m2", "ft2"), /finite, non-negative/);
  assert.throws(() => areaToSquareMetres(Infinity, "acre"), /finite, non-negative/);
});
