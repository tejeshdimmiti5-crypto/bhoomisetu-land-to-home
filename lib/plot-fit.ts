import type { Ring, Point2D } from "./geometry";
import type { FloorPlanRoom } from "./floor-plan";

export interface PlotFitResult {
  fits: boolean;
  errors: string[];
  plotBounds: { minX: number; minY: number; width: number; depth: number };
  layoutBounds: { width: number; depth: number };
}

const EPSILON = 1e-8;

function cross(a: Point2D, b: Point2D, c: Point2D): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function onSegment(a: Point2D, b: Point2D, p: Point2D): boolean {
  return Math.abs(cross(a, b, p)) <= EPSILON &&
    p[0] >= Math.min(a[0], b[0]) - EPSILON &&
    p[0] <= Math.max(a[0], b[0]) + EPSILON &&
    p[1] >= Math.min(a[1], b[1]) - EPSILON &&
    p[1] <= Math.max(a[1], b[1]) + EPSILON;
}

function segmentsIntersect(a: Point2D, b: Point2D, c: Point2D, d: Point2D): boolean {
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  if (((abC > EPSILON && abD < -EPSILON) || (abC < -EPSILON && abD > EPSILON)) &&
      ((cdA > EPSILON && cdB < -EPSILON) || (cdA < -EPSILON && cdB > EPSILON))) return true;
  return (Math.abs(abC) <= EPSILON && onSegment(a, b, c)) ||
    (Math.abs(abD) <= EPSILON && onSegment(a, b, d)) ||
    (Math.abs(cdA) <= EPSILON && onSegment(c, d, a)) ||
    (Math.abs(cdB) <= EPSILON && onSegment(c, d, b));
}

/** Strict point-in-polygon test: points on the plot boundary are not inside. */
function pointStrictlyInside(point: Point2D, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[j];
    const b = ring[i];
    if (onSegment(a, b, point)) return false;
    const crosses = (a[1] > point[1]) !== (b[1] > point[1]) &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0];
    if (crosses) inside = !inside;
  }
  return inside;
}

/**
 * Check whether axis-aligned room rectangles fit within a measured plot.
 * Layout (0,0) is aligned to the plot's minimum X/Y bounding-box corner.
 * This is geometric containment only; it does not check setbacks, access,
 * wall thickness, building regulations, structure, or legal survey accuracy.
 */
export function checkFloorPlanFitsPlot(ring: Ring, rooms: readonly FloorPlanRoom[]): PlotFitResult {
  const errors: string[] = [];
  if (!Array.isArray(ring) || ring.length < 3) {
    return { fits: false, errors: ["Plot boundary needs at least three vertices."], plotBounds: { minX: 0, minY: 0, width: 0, depth: 0 }, layoutBounds: { width: 0, depth: 0 } };
  }
  if (!Array.isArray(rooms) || rooms.length === 0) {
    return { fits: false, errors: ["Add at least one room before checking fit."], plotBounds: { minX: 0, minY: 0, width: 0, depth: 0 }, layoutBounds: { width: 0, depth: 0 } };
  }

  const xs = ring.map((point) => point[0]);
  const ys = ring.map((point) => point[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const plotBounds = { minX, minY, width: maxX - minX, depth: maxY - minY };
  const layoutBounds = {
    width: Math.max(...rooms.map((room) => room.x + room.width)),
    depth: Math.max(...rooms.map((room) => room.y + room.depth)),
  };

  if (layoutBounds.width > plotBounds.width + EPSILON || layoutBounds.depth > plotBounds.depth + EPSILON) {
    errors.push("The layout exceeds the plot's bounding-box dimensions.");
  }

  const shiftedRing: Point2D[] = ring.map(([x, y]) => [x - minX, y - minY]);
  for (const room of rooms) {
    const corners: Point2D[] = [
      [room.x, room.y],
      [room.x + room.width, room.y],
      [room.x + room.width, room.y + room.depth],
      [room.x, room.y + room.depth],
    ];
    if (!corners.every((corner) => pointStrictlyInside(corner, shiftedRing))) {
      errors.push(`Room "${room.name}" is not fully inside the plot boundary.`);
      continue;
    }
    for (let i = 0; i < corners.length; i += 1) {
      const a = corners[i];
      const b = corners[(i + 1) % corners.length];
      let crossesBoundary = false;
      for (let j = 0; j < shiftedRing.length; j += 1) {
        if (segmentsIntersect(a, b, shiftedRing[j], shiftedRing[(j + 1) % shiftedRing.length])) {
          crossesBoundary = true;
          break;
        }
      }
      if (crossesBoundary) {
        errors.push(`Room "${room.name}" crosses or touches the plot boundary.`);
        break;
      }
    }
  }

  return { fits: errors.length === 0, errors: [...new Set(errors)], plotBounds, layoutBounds };
}
