import { measurePolygon, type Point2D, type PlotMeasurements } from "./geometry";

export const PLOT_SCHEMA_VERSION = 1 as const;
const DB_NAME = "bhoomisetu-local";
const STORE_NAME = "plots";

export interface SavedPlot {
  schemaVersion: typeof PLOT_SCHEMA_VERSION;
  crs: "local-planar-m";
  coordinateUnit: "metre";
  origin: { latitude: number; longitude: number } | null;
  measurementMethod: "manual" | "gps";
  id: string;
  name: string;
  ring: Point2D[];
  areaM2: number;
  perimeterM: number;
  createdAt: string;
  updatedAt: string;
  recordVersion: number;
}

function createPlotId(): string {
  const cryptoApi = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();

  // randomUUID is unavailable in some non-secure LAN contexts. Prefer Web Crypto
  // bytes when present, but keep local plot creation usable without it.
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // IDs are local record keys, not authentication tokens.
  return `plot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("This browser does not support IndexedDB. Export your work from a supported browser."));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local plot storage."));
    request.onblocked = () => reject(new Error("Plot storage upgrade is blocked by another open BhoomiSetu tab."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local storage request failed."));
  });
}

export async function listPlots(): Promise<SavedPlot[]> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    const records = await requestResult(tx.objectStore(STORE_NAME).getAll() as IDBRequest<SavedPlot[]>);
    return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } finally {
    db.close();
  }
}

export async function savePlot(input: {
  id?: string;
  name: string;
  ring: unknown;
  origin?: { latitude: number; longitude: number } | null;
  measurementMethod?: "manual" | "gps";
}): Promise<{ plot: SavedPlot; measurements: PlotMeasurements }> {
  const name = input.name.trim();
  if (!name) throw new Error("Give this plot a name before saving.");
  const measurements = measurePolygon(input.ring);
  const now = new Date().toISOString();
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const previous = input.id ? await requestResult(store.get(input.id) as IDBRequest<SavedPlot | undefined>) : undefined;
    const plot: SavedPlot = {
      schemaVersion: PLOT_SCHEMA_VERSION,
      crs: "local-planar-m",
      coordinateUnit: "metre",
      origin: input.origin ?? null,
      measurementMethod: input.measurementMethod ?? "manual",
      id: previous?.id ?? input.id ?? createPlotId(),
      name,
      ring: measurements.ring,
      areaM2: measurements.areaM2,
      perimeterM: measurements.perimeterM,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      recordVersion: (previous?.recordVersion ?? 0) + 1,
    };
    await requestResult(store.put(plot));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Plot could not be committed."));
      tx.onabort = () => reject(tx.error ?? new Error("Plot save was cancelled."));
    });
    return { plot, measurements };
  } finally {
    db.close();
  }
}

export async function deletePlot(id: string): Promise<void> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Plot could not be deleted."));
      tx.onabort = () => reject(tx.error ?? new Error("Plot deletion was cancelled."));
    });
  } finally {
    db.close();
  }
}

export async function exportPlots(): Promise<string> {
  return JSON.stringify({
    app: "BhoomiSetu",
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    coordinateUnit: "metre",
    crs: "local-planar-m",
    plots: await listPlots(),
  }, null, 2);
}

export async function importPlots(text: string): Promise<number> {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error("That file is not valid JSON."); }
  if (!parsed || typeof parsed !== "object" || !("plots" in parsed) || !Array.isArray(parsed.plots)) {
    throw new Error("This is not a BhoomiSetu plot export.");
  }
  const incoming = parsed.plots as unknown[];
  if (incoming.length > 10000) throw new Error("Backup contains too many plot records (maximum 10,000).");
  const seenIds = new Set<string>();
  const validated: SavedPlot[] = incoming.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`Plot ${index + 1} is not a valid record.`);
    const value = item as Partial<SavedPlot>;
    if (typeof value.id !== "string" || !value.id.trim() || value.id.length > 200 || typeof value.name !== "string") {
      throw new Error(`Plot ${index + 1} is missing a valid ID or name.`);
    }
    if (seenIds.has(value.id)) throw new Error(`Backup contains duplicate plot ID “${value.id}”.`);
    seenIds.add(value.id);
    if (value.schemaVersion !== undefined && value.schemaVersion !== PLOT_SCHEMA_VERSION) {
      throw new Error(`Plot ${index + 1} uses an unsupported schema version.`);
    }
    if (value.crs !== undefined && value.crs !== "local-planar-m") {
      throw new Error(`Plot ${index + 1} uses an unsupported coordinate reference.`);
    }
    if (value.coordinateUnit !== undefined && value.coordinateUnit !== "metre") {
      throw new Error(`Plot ${index + 1} does not use metre coordinates.`);
    }
    if (value.measurementMethod !== undefined && value.measurementMethod !== "manual" && value.measurementMethod !== "gps") {
      throw new Error(`Plot ${index + 1} uses an unsupported measurement method.`);
    }
    if (value.origin !== undefined && value.origin !== null && (typeof value.origin !== "object" || !Number.isFinite(value.origin.latitude) || !Number.isFinite(value.origin.longitude) || Math.abs(value.origin.latitude) > 90 || Math.abs(value.origin.longitude) > 180)) {
      throw new Error(`Plot ${index + 1} has invalid GPS origin metadata.`);
    }
    const measured = measurePolygon(value.ring);
    const now = new Date().toISOString();
    return {
      schemaVersion: PLOT_SCHEMA_VERSION,
      crs: "local-planar-m",
      coordinateUnit: "metre",
      origin: value.origin ?? null,
      measurementMethod: value.measurementMethod ?? "manual",
      id: value.id,
      name: value.name.trim() || `Imported plot ${index + 1}`,
      ring: measured.ring,
      areaM2: measured.areaM2,
      perimeterM: measured.perimeterM,
      createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
      updatedAt: now,
      recordVersion: Number.isInteger(value.recordVersion) && (value.recordVersion ?? 0) >= 1 ? value.recordVersion! + 1 : 1,
    };
  });
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    validated.forEach((plot) => store.put(plot));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Import could not be committed."));
      tx.onabort = () => reject(tx.error ?? new Error("Import was cancelled."));
    });
    return validated.length;
  } finally {
    db.close();
  }
}

export async function requestPersistentStorage(): Promise<"granted" | "denied" | "unsupported"> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return "unsupported";
  return (await navigator.storage.persist()) ? "granted" : "denied";
}
