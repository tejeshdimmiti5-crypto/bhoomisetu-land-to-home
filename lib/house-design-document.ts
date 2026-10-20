import { validateFloorPlanRooms, type FloorPlanRoom } from "./floor-plan";

export const HOUSE_DESIGN_SCHEMA_VERSION = 1 as const;
export const HOUSE_DESIGN_MAX_BYTES = 1024 * 1024;

export interface HouseDesignDocument {
  schemaVersion: typeof HOUSE_DESIGN_SCHEMA_VERSION;
  id: string;
  name: string;
  units: "metres";
  coordinateSystem: "local-planar";
  linkedPlotId: string | null;
  rooms: FloorPlanRoom[];
  createdAt: string;
  updatedAt: string;
}

export interface DesignDocumentResult {
  valid: boolean;
  errors: string[];
  document: HouseDesignDocument | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Validate untrusted design data without mutating it or silently correcting geometry. */
export function validateHouseDesignDocument(input: unknown): DesignDocumentResult {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { valid: false, errors: ["Design document must be an object."], document: null };
  }
  if (input.schemaVersion !== HOUSE_DESIGN_SCHEMA_VERSION) {
    errors.push(`Unsupported design schema version. Expected ${HOUSE_DESIGN_SCHEMA_VERSION}.`);
  }
  if (!nonEmptyString(input.id)) errors.push("Design document needs a non-empty ID.");
  if (!nonEmptyString(input.name) || input.name.trim().length > 100) errors.push("Design name must contain 1–100 characters.");
  if (input.units !== "metres") errors.push("Design dimensions must use metres.");
  if (input.coordinateSystem !== "local-planar") errors.push("Unsupported coordinate system.");
  if (input.linkedPlotId !== null && !nonEmptyString(input.linkedPlotId)) errors.push("Linked plot ID must be a non-empty string or null.");
  if (!nonEmptyString(input.createdAt) || !Number.isFinite(Date.parse(input.createdAt))) errors.push("Created timestamp must be a valid date string.");
  if (!nonEmptyString(input.updatedAt) || !Number.isFinite(Date.parse(input.updatedAt))) errors.push("Updated timestamp must be a valid date string.");

  const roomValidation = validateFloorPlanRooms(input.rooms);
  errors.push(...roomValidation.errors);
  if (errors.length) return { valid: false, errors, document: null };

  // The validator above establishes the room shape and numeric bounds.
  const document: HouseDesignDocument = {
    schemaVersion: HOUSE_DESIGN_SCHEMA_VERSION,
    id: input.id as string,
    name: (input.name as string).trim(),
    units: "metres",
    coordinateSystem: "local-planar",
    linkedPlotId: input.linkedPlotId as string | null,
    rooms: (input.rooms as FloorPlanRoom[]).map((room) => ({ ...room })),
    createdAt: input.createdAt as string,
    updatedAt: input.updatedAt as string,
  };
  return { valid: true, errors: [], document };
}

/** Convert the existing v1 editor save shape to the canonical document model. */
export function migrateLegacyFloorPlan(input: unknown, options: {
  id: string;
  now?: string;
  linkedPlotId?: string | null;
}): DesignDocumentResult {
  if (!isRecord(input) || input.version !== 1 || !Array.isArray(input.rooms)) {
    return { valid: false, errors: ["Unsupported legacy floor-plan format."], document: null };
  }
  const now = options.now ?? new Date().toISOString();
  return validateHouseDesignDocument({
    schemaVersion: HOUSE_DESIGN_SCHEMA_VERSION,
    id: options.id,
    name: typeof input.name === "string" && input.name.trim() ? input.name.trim().slice(0, 100) : "Imported home",
    units: "metres",
    coordinateSystem: "local-planar",
    linkedPlotId: options.linkedPlotId ?? null,
    rooms: input.rooms,
    createdAt: now,
    updatedAt: now,
  });
}

/** Serialize only a validated canonical document. */
export function serializeHouseDesignDocument(input: unknown): string {
  const result = validateHouseDesignDocument(input);
  if (!result.valid || !result.document) throw new Error(result.errors[0] ?? "Invalid design document.");
  return JSON.stringify(result.document, null, 2);
}

/** Reject oversized JSON before parsing; parsing alone does not establish schema validity. */
export function parseHouseDesignDocument(json: string): DesignDocumentResult {
  if (new TextEncoder().encode(json).byteLength > HOUSE_DESIGN_MAX_BYTES) {
    return { valid: false, errors: ["Design document exceeds the 1 MB limit."], document: null };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { valid: false, errors: ["Design document is not valid JSON."], document: null };
  }
  return validateHouseDesignDocument(parsed);
}
