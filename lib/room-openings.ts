import type { FloorPlanRoom } from "./floor-plan";

export type OpeningKind = "door" | "window";
export type WallSide = "north" | "east" | "south" | "west";

export interface RoomOpening {
  id: string;
  roomId: string;
  kind: OpeningKind;
  wall: WallSide;
  /** Distance in metres from the wall's top/left origin corner. */
  offsetM: number;
  widthM: number;
}

export interface OpeningValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Validate opening placement against the room rectangle only.
 * This does not validate wall construction, egress, accessibility, or building codes.
 */
export function validateRoomOpenings(
  roomsInput: unknown,
  openingsInput: unknown,
): OpeningValidation {
  const errors: string[] = [];
  if (!Array.isArray(roomsInput)) {
    return { valid: false, errors: ["Rooms must be an array before openings can be checked."] };
  }
  if (!Array.isArray(openingsInput)) {
    return { valid: false, errors: ["Openings must be an array."] };
  }

  const rooms = roomsInput as FloorPlanRoom[];
  const roomById = new Map<string, FloorPlanRoom>();
  for (const room of rooms) {
    if (room && typeof room.id === "string" && !roomById.has(room.id)) {
      roomById.set(room.id, room);
    }
  }

  const ids = new Set<string>();
  const byWall = new Map<string, RoomOpening[]>();
  openingsInput.forEach((value: unknown, index: number) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      errors.push(`Opening ${index + 1} must be an object.`);
      return;
    }
    const opening = value as Partial<RoomOpening>;
    if (typeof opening.id !== "string" || !opening.id.trim()) {
      errors.push(`Opening ${index + 1} needs a non-empty ID.`);
    } else if (ids.has(opening.id)) {
      errors.push(`Duplicate opening ID “${opening.id}”.`);
    } else {
      ids.add(opening.id);
    }

    if (opening.kind !== "door" && opening.kind !== "window") {
      errors.push(`Opening ${index + 1} kind must be door or window.`);
    }
    if (!["north", "east", "south", "west"].includes(String(opening.wall))) {
      errors.push(`Opening ${index + 1} wall must be north, east, south, or west.`);
    }
    const room = typeof opening.roomId === "string" ? roomById.get(opening.roomId) : undefined;
    if (!room) {
      errors.push(`Opening ${index + 1} references an unknown room.`);
      return;
    }
    if (typeof opening.offsetM !== "number" || !Number.isFinite(opening.offsetM) || opening.offsetM < 0) {
      errors.push(`Opening ${index + 1} offset must be a finite non-negative number.`);
      return;
    }
    if (typeof opening.widthM !== "number" || !Number.isFinite(opening.widthM) || opening.widthM <= 0) {
      errors.push(`Opening ${index + 1} width must be a finite positive number.`);
      return;
    }

    const wallLength = opening.wall === "north" || opening.wall === "south" ? room.width : room.depth;
    if (opening.offsetM + opening.widthM > wallLength + 1e-9) {
      errors.push(`Opening ${index + 1} extends beyond its room wall.`);
      return;
    }

    const wallKey = `${room.id}:${opening.wall}`;
    const sameWall = byWall.get(wallKey) ?? [];
    const next = opening as RoomOpening;
    for (const existing of sameWall) {
      const overlaps = next.offsetM < existing.offsetM + existing.widthM &&
        next.offsetM + next.widthM > existing.offsetM;
      if (overlaps) {
        errors.push(`Opening “${next.id}” overlaps opening “${existing.id}” on the same wall.`);
      }
    }
    sameWall.push(next);
    byWall.set(wallKey, sameWall);
  });

  return { valid: errors.length === 0, errors };
}
