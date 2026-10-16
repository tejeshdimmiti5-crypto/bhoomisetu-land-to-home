import "fake-indexeddb/auto";
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { deletePlot, exportPlots, importPlots, listPlots, savePlot } from "../lib/plot-store";
import { projectGpsToLocal } from "../lib/gps-projection";

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
  assert.deepEqual(await importPlots(backup), { imported: 0, unchanged: 1, conflicts: [] });
  assert.deepEqual(await importPlots(backup), { imported: 0, unchanged: 1, conflicts: [] });
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
  assert.deepEqual(await importPlots(backup), { imported: 1, unchanged: 0, conflicts: [] });
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

test("GPS projection returns east/north metre offsets and rounds to millimetres", () => {
  const origin = { latitude: 0, longitude: 0 };
  const point = projectGpsToLocal(origin, 0.001, 0.001);
  assert.ok(point[0] > 111 && point[0] < 112);
  assert.ok(point[1] > 111 && point[1] < 112);
  assert.equal(point[0], Number(point[0].toFixed(3)));
  assert.equal(point[1], Number(point[1].toFixed(3)));
});

test("GPS projection handles longitude wrap and rejects invalid coordinates", () => {
  const point = projectGpsToLocal({ latitude: 0, longitude: 179.999 }, 0, -179.999);
  assert.ok(point[0] > 200 && point[0] < 225);
  assert.throws(() => projectGpsToLocal({ latitude: 91, longitude: 0 }, 0, 0), /valid ranges/);
  assert.throws(() => projectGpsToLocal({ latitude: 0, longitude: 0 }, Number.NaN, 0), /valid ranges/);
});

test("restoring an older backup never overwrites newer local edits", async () => {
  const original = await savePlot({ name: "Original name", ring: rectangle });
  const backup = await exportPlots();
  await savePlot({ id: original.plot.id, name: "Newer local edit", ring: [[0, 0], [12, 0], [12, 5], [0, 5]] });

  const result = await importPlots(backup);
  assert.equal(result.imported, 0);
  assert.equal(result.unchanged, 0);
  assert.deepEqual(result.conflicts, [{ id: original.plot.id, name: "Original name" }]);

  const local = (await listPlots())[0];
  assert.equal(local.name, "Newer local edit");
  assert.equal(local.areaM2, 60);
});

test("import adds new records but reports conflicts without replacing existing records", async () => {
  const existing = await savePlot({ name: "Keep this", ring: rectangle });
  const newRecord = { id: "new-record", name: "New record", ring: rectangle };
  const conflict = { id: existing.plot.id, name: "Backup version", ring: [[0, 0], [20, 0], [20, 5], [0, 5]] };
  const result = await importPlots(JSON.stringify({ plots: [newRecord, conflict] }));
  assert.equal(result.imported, 1);
  assert.equal(result.conflicts.length, 1);
  const plots = await listPlots();
  assert.equal(plots.length, 2);
  assert.equal(plots.find((plot) => plot.id === existing.plot.id)?.name, "Keep this");
});
