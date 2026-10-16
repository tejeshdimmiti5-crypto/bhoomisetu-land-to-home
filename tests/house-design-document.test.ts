import test from "node:test";
import assert from "node:assert/strict";
import {
  migrateLegacyFloorPlan,
  parseHouseDesignDocument,
  serializeHouseDesignDocument,
  validateHouseDesignDocument,
  type HouseDesignDocument,
} from "../lib/house-design-document";

const now = "2026-10-16T10:00:00.000Z";
const validDocument: HouseDesignDocument = {
  schemaVersion: 1,
  id: "design-1",
  name: "Family home",
  units: "metres",
  coordinateSystem: "local-planar",
  linkedPlotId: null,
  rooms: [{ id: "living", name: "Living", x: 0, y: 0, width: 5, depth: 4 }],
  createdAt: now,
  updatedAt: now,
};

test("accepts a valid canonical design document and returns a defensive room copy", () => {
  const result = validateHouseDesignDocument(validDocument);
  assert.equal(result.valid, true);
  assert.equal(result.document?.name, "Family home");
  assert.notEqual(result.document?.rooms, validDocument.rooms);
});

test("rejects unknown schema versions, units, duplicate IDs and invalid timestamps", () => {
  const result = validateHouseDesignDocument({
    ...validDocument,
    schemaVersion: 2,
    units: "feet",
    createdAt: "not-a-date",
    rooms: [...validDocument.rooms, { ...validDocument.rooms[0] }],
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("schema version")));
  assert.ok(result.errors.some((error) => error.includes("metres")));
  assert.ok(result.errors.some((error) => error.includes("Duplicate room ID")));
  assert.ok(result.errors.some((error) => error.includes("valid date")));
});

test("migrates legacy editor data without changing room geometry", () => {
  const rooms = [{ id: "kitchen", name: "Kitchen", x: 2, y: 1, width: 3, depth: 2 }];
  const result = migrateLegacyFloorPlan({ version: 1, name: "Old plan", rooms, updatedAt: now }, {
    id: "migrated-1", now,
  });
  assert.equal(result.valid, true);
  assert.equal(result.document?.schemaVersion, 1);
  assert.deepEqual(result.document?.rooms, rooms);
  assert.equal(result.document?.name, "Old plan");
});

test("rejects malformed legacy data and unsupported document shapes", () => {
  assert.equal(migrateLegacyFloorPlan({ version: 2, rooms: [] }, { id: "x", now }).valid, false);
  assert.equal(validateHouseDesignDocument(null).valid, false);
});

test("serialization round-trips validated documents and rejects invalid input", () => {
  const json = serializeHouseDesignDocument(validDocument);
  assert.deepEqual(parseHouseDesignDocument(json).document, validDocument);
  assert.throws(() => serializeHouseDesignDocument({ ...validDocument, units: "feet" }));
});

test("rejects invalid JSON and documents larger than the import limit", () => {
  assert.equal(parseHouseDesignDocument("{").valid, false);
  assert.equal(parseHouseDesignDocument(" ".repeat(1024 * 1024 + 1)).valid, false);
});
