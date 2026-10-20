import test from "node:test";
import assert from "node:assert/strict";
import { calculateEstimate, type EstimateInput } from "../lib/estimate";

const input: EstimateInput = {
  schemaVersion: 1,
  title: "Sample user-entered estimate",
  region: "User supplied region",
  currency: "INR",
  preparedAt: "2026-10-16T10:00:00.000Z",
  exclusions: ["Land purchase", "Approval fees", "Professional fees"],
  items: [{
    id: "cement",
    description: "Cement bags",
    quantity: 10,
    unit: "bag",
    unitRateINR: 350,
    rateOrigin: "user_quote",
    sourceLabel: "Example quotation entered by user",
    sourceDate: "2026-10-15",
    region: "User supplied region",
    wastagePercent: 5,
  }],
};

test("calculates deterministic line totals and explicit wastage", () => {
  const result = calculateEstimate(input);
  assert.equal(result.valid, true);
  assert.equal(result.subtotalINR, 3500);
  assert.equal(result.totalWastageINR, 175);
  assert.equal(result.totalINR, 3675);
  assert.equal(result.lineItems[0].totalINR, 3675);
  assert.match(result.disclaimer, /not a contractor quote/);
});

test("does not invent rates when there are no line items", () => {
  const result = calculateEstimate({ ...input, items: [] });
  assert.equal(result.valid, true);
  assert.equal(result.totalINR, 0);
  assert.equal(result.coverage, "no-line-items");
});

test("rejects invalid quantity, negative rate, invalid date and unlabelled rate origin", () => {
  const result = calculateEstimate({
    ...input,
    items: [{
      ...input.items[0], quantity: 0, unitRateINR: -1,
      sourceDate: "not-a-date", rateOrigin: "guess",
    }],
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("quantity")));
  assert.ok(result.errors.some((error) => error.includes("rate must")));
  assert.ok(result.errors.some((error) => error.includes("source date")));
  assert.ok(result.errors.some((error) => error.includes("rate origin")));
});

test("rejects duplicate IDs, missing sources, and invalid wastage", () => {
  const result = calculateEstimate({
    ...input,
    items: [
      input.items[0],
      { ...input.items[0], sourceLabel: "", wastagePercent: 101 },
    ],
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("Duplicate estimate item ID")));
  assert.ok(result.errors.some((error) => error.includes("source label")));
  assert.ok(result.errors.some((error) => error.includes("wastage")));
});

test("rejects unknown schema, unsupported currency and malformed top-level input", () => {
  assert.equal(calculateEstimate(null).valid, false);
  assert.equal(calculateEstimate({ ...input, schemaVersion: 2 }).valid, false);
  assert.equal(calculateEstimate({ ...input, currency: "USD" }).valid, false);
});
