import "fake-indexeddb/auto";
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { deletePlot, exportPlots, importPlots, listPlots, savePlot } from "../lib/plot-store";

const DB_NAME = "bhoomisetu-local";
function clearDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Database unexpectedly blocked during test reset."));
  });
}
beforeEach(async () => { await clearDatabase(); });

const rectangle = [[0, 0], [10, 0], [10, 5], [0, 5]];

test("create, edit and save again updates the same record rather than duplicating it", async () => {
  const first = await savePlot({ name: "Family plot", ring: rectangle });
  assert.equal(first.plot.recordVersion, 1);
  const second = await savePlot({
    id: first.plot.id,
    name: "Family plot updated",
    ring: [[0, 0], [12, 0], [12, 5], [0, 5]],
  });
  const all = await listPlots();
  assert.equal(all.length, 1);
  assert.equal(second.plot.id, first.plot.id);
  assert.equal(second.plot.recordVersion, 2);
  assert.equal(second.plot.createdAt, first.plot.createdAt);
  assert.equal(second.plot.name, "Family plot updated");
  assert.equal(second.plot.areaM2, 60);
});

test("saving without an ID creates distinct records", async () => {
  const first = await savePlot({ name: "Plot A", ring: rectangle });
  const second = await savePlot({ name: "Plot B", ring: rectangle });
  assert.notEqual(first.plot.id, second.plot.id);
  assert.equal((await listPlots()).length, 2);
});

test("invalid geometry is rejected and never persisted", async () => {
  await assert.rejects(savePlot({ name: "Invalid", ring: [[0, 0], [2, 2], [0, 2], [2, 0]] }), /intersect or touch/);
  assert.equal((await listPlots()).length, 0);
});

test("export and repeated import upsert by ID instead of duplicating", async () => {
  const original = await savePlot({ name: "Backup test", ring: rectangle });
  const backup = await exportPlots();
  assert.equal(await importPlots(backup), 1);
  assert.equal(await importPlots(backup), 1);
  const all = await listPlots();
  assert.equal(all.length, 1);
  assert.equal(all[0].id, original.plot.id);
  assert.equal(all[0].areaM2, 50);
});

test("import validates all records before writing any records", async () => {
  const valid = { id: "valid", name: "Valid", ring: rectangle };
  const invalid = { id: "invalid", name: "Invalid", ring: [[0, 0], [2, 2], [0, 2], [2, 0]] };
  await assert.rejects(importPlots(JSON.stringify({ plots: [valid, invalid] })), /intersect or touch/);
  assert.equal((await listPlots()).length, 0);
});

test("import rejects duplicate IDs in a single backup before writing", async () => {
  const duplicate = { id: "same-id", name: "Repeated", ring: rectangle };
  await assert.rejects(
    importPlots(JSON.stringify({ plots: [duplicate, { ...duplicate, name: "Repeated copy" }] })),
    /duplicate plot ID/,
  );
  assert.equal((await listPlots()).length, 0);
});

test("import rejects unsupported coordinate metadata", async () => {
  const wrongUnits = { id: "feet-plot", name: "Feet plot", coordinateUnit: "feet", ring: rectangle };
  await assert.rejects(importPlots(JSON.stringify({ plots: [wrongUnits] })), /does not use metre coordinates/);
  assert.equal((await listPlots()).length, 0);
});

test("GPS capture provenance survives save, export and import", async () => {
  const origin = { latitude: 16.4300, longitude: 81.0000 };
  const saved = await savePlot({ name: "GPS plot", ring: rectangle, origin, measurementMethod: "gps" });
  assert.equal(saved.plot.measurementMethod, "gps");
  assert.deepEqual(saved.plot.origin, origin);
  const backup = await exportPlots();
  await deletePlot(saved.plot.id);
  await importPlots(backup);
  const restored = (await listPlots())[0];
  assert.equal(restored.measurementMethod, "gps");
  assert.deepEqual(restored.origin, origin);
});

test("import rejects invalid GPS origin metadata before writing", async () => {
  const badOrigin = { id: "bad-gps", name: "Bad GPS", origin: { latitude: 100, longitude: 10 }, ring: rectangle };
  await assert.rejects(importPlots(JSON.stringify({ plots: [badOrigin] })), /invalid GPS origin/);
  assert.equal((await listPlots()).length, 0);
});

test("delete removes only the selected plot", async () => {
  const first = await savePlot({ name: "Keep", ring: rectangle });
  const second = await savePlot({ name: "Remove", ring: rectangle });
  await deletePlot(second.plot.id);
  const all = await listPlots();
  assert.equal(all.length, 1);
  assert.equal(all[0].id, first.plot.id);
});
