export interface FloorPlanRoom {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
}

export interface FloorPlanBounds {
  width: number;
  depth: number;
}

export interface FloorPlanValidation {
  valid: boolean;
  errors: string[];
  bounds: FloorPlanBounds;
  totalRoomAreaM2: number;
  overlappingRoomIds: string[];
}

export interface FloorPlanRoomDimensionLabel {
  id: string;
  name: string;
  width: number;
  depth: number;
  label: string;
  x: number;
  y: number;
}

export interface FloorPlanAnnotations {
  valid: boolean;
  errors: string[];
  bounds: FloorPlanBounds;
  overallLabel: string;
  roomLabels: FloorPlanRoomDimensionLabel[];
}

const MAX_ROOMS = 40;
const MAX_POSITION_M = 30;
const MAX_DIMENSION_M = 15;
const MIN_DIMENSION_M = 1;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatMetricDimension(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(2)} m`;
}

export function formatRoomDimensionLabel(room: Pick<FloorPlanRoom, "name" | "width" | "depth">): string {
  return `${room.name}: ${formatMetricDimension(room.width)} × ${formatMetricDimension(room.depth)}`;
}

export function buildFloorPlanAnnotations(rooms: FloorPlanRoom[]): FloorPlanAnnotations {
  const validation = validateFloorPlanRooms(rooms);
  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
      bounds: validation.bounds,
      overallLabel: "Unavailable",
      roomLabels: [],
    };
  }

  const roomLabels = rooms.map((room) => ({
    id: room.id,
    name: room.name,
    width: room.width,
    depth: room.depth,
    label: formatRoomDimensionLabel(room),
    x: room.x + room.width / 2,
    y: room.y + room.depth / 2,
  }));

  return {
    valid: true,
    errors: [],
    bounds: validation.bounds,
    overallLabel: `${formatMetricDimension(validation.bounds.width)} × ${formatMetricDimension(validation.bounds.depth)}`,
    roomLabels,
  };
}

/** Positive-area rectangle intersection. Rooms that only share an edge are not overlapping. */
export function roomsOverlap(a: FloorPlanRoom, b: FloorPlanRoom): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.depth && a.y + a.depth > b.y;
}

/** Validate untrusted room records and derive simple, non-structural layout metrics. */
export function validateFloorPlanRooms(input: unknown): FloorPlanValidation {
  const errors: string[] = [];
  if (!Array.isArray(input)) {
    return { valid: false, errors: ["Rooms must be an array."], bounds: { width: 0, depth: 0 }, totalRoomAreaM2: 0, overlappingRoomIds: [] };
  }
  if (input.length === 0) errors.push("A floor plan must contain at least one room.");
  if (input.length > MAX_ROOMS) errors.push(`A floor plan can contain at most ${MAX_ROOMS} rooms.`);

  const rooms: FloorPlanRoom[] = [];
  const ids = new Set<string>();
  input.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`Room ${index + 1} must be an object.`);
      return;
    }
    const room = item as Partial<FloorPlanRoom>;
    if (typeof room.id !== "string" || !room.id.trim()) errors.push(`Room ${index + 1} needs a non-empty ID.`);
    else if (ids.has(room.id)) errors.push(`Duplicate room ID “${room.id}”.`);
    else ids.add(room.id);
    if (typeof room.name !== "string" || !room.name.trim()) errors.push(`Room ${index + 1} needs a name.`);
    const x = room.x;
    const y = room.y;
    const width = room.width;
    const depth = room.depth;
    // Use explicit guards so TypeScript narrows each untrusted optional field.
    if (
      !isFiniteNumber(x) ||
      !isFiniteNumber(y) ||
      !isFiniteNumber(width) ||
      !isFiniteNumber(depth)
    ) {
      errors.push(`Room ${index + 1} coordinates and dimensions must be finite numbers.`);
      return;
    }
    if (x < 0 || y < 0 || x > MAX_POSITION_M || y > MAX_POSITION_M) {
      errors.push(`Room ${index + 1} position must be between 0 and ${MAX_POSITION_M} metres.`);
    }
    if (width < MIN_DIMENSION_M || depth < MIN_DIMENSION_M ||
        width > MAX_DIMENSION_M || depth > MAX_DIMENSION_M) {
      errors.push(`Room ${index + 1} width and depth must be between ${MIN_DIMENSION_M} and ${MAX_DIMENSION_M} metres.`);
    }
    rooms.push({ ...room, x, y, width, depth } as FloorPlanRoom);
  });

  const bounds = {
    width: rooms.reduce((max, room) => Math.max(max, room.x + room.width), 0),
    depth: rooms.reduce((max, room) => Math.max(max, room.y + room.depth), 0),
  };
  const totalRoomAreaM2 = rooms.reduce((sum, room) => sum + room.width * room.depth, 0);
  const overlapping = new Set<string>();
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (roomsOverlap(rooms[i], rooms[j])) {
        overlapping.add(rooms[i].id);
        overlapping.add(rooms[j].id);
      }
    }
  }
  if (overlapping.size) errors.push("One or more room rectangles overlap.");
  return { valid: errors.length === 0, errors, bounds, totalRoomAreaM2, overlappingRoomIds: [...overlapping].sort() };
}
