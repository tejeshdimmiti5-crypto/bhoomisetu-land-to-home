import { validateFloorPlanRooms, type FloorPlanRoom } from "./floor-plan";
import { checkFloorPlanFitsPlot } from "./plot-fit";
import type { Ring } from "./geometry";

export interface RoomRequirement {
  id: string;
  name: string;
  width: number;
  depth: number;
}

export type LayoutStrategy = "requested-order" | "wide-first" | "deep-first";

export interface LayoutCandidate {
  strategy: LayoutStrategy;
  rooms: FloorPlanRoom[];
  valid: boolean;
  errors: string[];
  plotWidth: number;
  plotDepth: number;
}

/**
 * Produce transparent, deterministic row-packed candidates for a rectangular plot.
 * This is a concept-layout helper, not an architectural optimizer or code checker.
 */
export function generateRectangularLayoutCandidates(
  requirements: unknown,
  plotWidth: number,
  plotDepth: number,
): LayoutCandidate[] {
  if (!Number.isFinite(plotWidth) || !Number.isFinite(plotDepth) || plotWidth <= 0 || plotDepth <= 0) {
    return [];
  }
  if (!Array.isArray(requirements) || requirements.length === 0 || requirements.length > 40) {
    return [];
  }

  const errors: string[] = [];
  const ids = new Set<string>();
  const rooms: RoomRequirement[] = [];
  requirements.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") {
      errors.push(`Room requirement ${index + 1} must be an object.`);
      return;
    }
    const item = raw as Partial<RoomRequirement>;
    if (typeof item.id !== "string" || !item.id.trim()) errors.push(`Room requirement ${index + 1} needs an ID.`);
    else if (ids.has(item.id)) errors.push(`Duplicate room requirement ID “${item.id}”.`);
    else ids.add(item.id);
    if (typeof item.name !== "string" || !item.name.trim()) errors.push(`Room requirement ${index + 1} needs a name.`);
    if (!Number.isFinite(item.width) || (item.width ?? 0) < 1 || (item.width ?? 0) > 15) errors.push(`Room requirement ${index + 1} width must be between 1 and 15 metres.`);
    if (!Number.isFinite(item.depth) || (item.depth ?? 0) < 1 || (item.depth ?? 0) > 15) errors.push(`Room requirement ${index + 1} depth must be between 1 and 15 metres.`);
    if (typeof item.id === "string" && item.id.trim() && typeof item.name === "string" && item.name.trim() &&
        Number.isFinite(item.width) && (item.width ?? 0) >= 1 && (item.width ?? 0) <= 15 &&
        Number.isFinite(item.depth) && (item.depth ?? 0) >= 1 && (item.depth ?? 0) <= 15) {
      rooms.push({ id: item.id, name: item.name, width: item.width as number, depth: item.depth as number });
    }
  });
  if (errors.length || rooms.length !== requirements.length) return [];

  const orders: Array<{ strategy: LayoutStrategy; rooms: RoomRequirement[] }> = [
    { strategy: "requested-order", rooms: [...rooms] },
    { strategy: "wide-first", rooms: [...rooms].sort((a, b) => b.width - a.width || b.depth - a.depth || a.id.localeCompare(b.id)) },
    { strategy: "deep-first", rooms: [...rooms].sort((a, b) => b.depth - a.depth || b.width - a.width || a.id.localeCompare(b.id)) },
  ];

  return orders.map(({ strategy, rooms: order }) => {
    let x = 0;
    let y = 0;
    let rowDepth = 0;
    const placed: FloorPlanRoom[] = [];
    const candidateErrors: string[] = [];
    for (const room of order) {
      if (room.width > plotWidth) {
        candidateErrors.push(`${room.name} is wider than the rectangular plot.`);
        continue;
      }
      if (x + room.width > plotWidth + 1e-9) {
        y += rowDepth;
        x = 0;
        rowDepth = 0;
      }
      if (y + room.depth > plotDepth + 1e-9) {
        candidateErrors.push(`${room.name} does not fit within the available plot depth.`);
        continue;
      }
      placed.push({ ...room, x, y });
      x += room.width;
      rowDepth = Math.max(rowDepth, room.depth);
    }
    const geometry = validateFloorPlanRooms(placed);
    candidateErrors.push(...geometry.errors);
    const valid = placed.length === rooms.length && geometry.valid &&
      geometry.bounds.width <= plotWidth + 1e-9 && geometry.bounds.depth <= plotDepth + 1e-9;
    if (!valid && candidateErrors.length === 0) candidateErrors.push("Not all room requirements fit within the rectangular plot.");
    return { strategy, rooms: placed, valid, errors: [...new Set(candidateErrors)], plotWidth, plotDepth };
  });
}


/**
 * Generate concept layouts against a saved plot's actual polygon, not just its
 * bounding rectangle. A small 0.1 m inset avoids treating room edges as if
 * they may sit directly on the plot boundary; it is not a regulatory setback.
 */
export function generatePlotLayoutCandidates(
  requirements: unknown,
  ring: Ring,
): LayoutCandidate[] {
  if (!Array.isArray(ring) || ring.length < 3 ||
      !ring.every((point) => Array.isArray(point) && point.length === 2 &&
        Number.isFinite(point[0]) && Number.isFinite(point[1]))) return [];
  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX;
  const depth = Math.max(...ys) - minY;
  const inset = 0.1;
  if (width <= inset * 2 || depth <= inset * 2) return [];

  return generateRectangularLayoutCandidates(requirements, width - inset * 2, depth - inset * 2)
    .map((candidate) => {
      const shiftedRooms = candidate.rooms.map((room) => ({
        ...room,
        x: room.x + inset,
        y: room.y + inset,
      }));
      const fit = checkFloorPlanFitsPlot(ring, shiftedRooms);
      const errors = [...new Set([...candidate.errors, ...fit.errors])];
      return {
        ...candidate,
        rooms: shiftedRooms,
        valid: candidate.valid && fit.fits,
        errors: candidate.valid && fit.fits ? [] : errors,
        plotWidth: width,
        plotDepth: depth,
      };
    });
}
