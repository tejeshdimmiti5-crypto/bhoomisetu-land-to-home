/**
 * BhoomiSetu's local-planar geometry contract.
 *
 * Coordinates are metres in a local planar frame, quantized to 1 mm before
 * validation or measurement. Rings are OPEN: repeating the first vertex at
 * the end is rejected rather than silently normalized.
 */

export type Point2D = readonly [x: number, y: number];
export type Ring = readonly Point2D[];

export interface PlotMeasurements {
  areaM2: number;
  perimeterM: number;
  vertexCount: number;
  ring: Point2D[];
}

export interface GeometryOptions {
  /** Smallest allowed edge, after millimetre quantization. Defaults to 1 mm. */
  minEdgeM?: number;
  /** Smallest allowed polygon area. Defaults to 1 cm². */
  minAreaM2?: number;
}

const QUANTUM = 0.001;
const DEFAULT_MIN_EDGE_M = 0.001;
const DEFAULT_MIN_AREA_M2 = 0.0001;
const DEFAULT_MIN_EFFECTIVE_WIDTH_M = 0.01;
/** Keeps the O(n²) intersection check bounded for user-supplied/imported rings. */
export const MAX_POLYGON_VERTICES = 500;
const EPSILON = 1e-9;

function roundHalfAwayFromZero(value: number): number {
  const scaled = Math.abs(value) / QUANTUM;
  const rounded = Math.floor(scaled + 0.5 + Number.EPSILON);
  return Math.sign(value) * rounded * QUANTUM;
}

function assertPoint(value: unknown, index: number): asserts value is Point2D {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error(`Vertex ${index} must contain exactly [x, y].`);
  }
  for (const coordinate of value) {
    if (typeof coordinate !== "number" || !Number.isFinite(coordinate)) {
      throw new Error(`Vertex ${index} coordinates must be finite numbers (booleans are not valid).`);
    }
  }
}

function samePoint(a: Point2D, b: Point2D): boolean {
  return Math.abs(a[0] - b[0]) <= EPSILON && Math.abs(a[1] - b[1]) <= EPSILON;
}

function cross(a: Point2D, b: Point2D, c: Point2D): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function onSegment(a: Point2D, b: Point2D, p: Point2D): boolean {
  return Math.abs(cross(a, b, p)) <= EPSILON
    && p[0] >= Math.min(a[0], b[0]) - EPSILON
    && p[0] <= Math.max(a[0], b[0]) + EPSILON
    && p[1] >= Math.min(a[1], b[1]) - EPSILON
    && p[1] <= Math.max(a[1], b[1]) + EPSILON;
}

function segmentsIntersect(a: Point2D, b: Point2D, c: Point2D, d: Point2D): boolean {
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);

  if (((abC > EPSILON && abD < -EPSILON) || (abC < -EPSILON && abD > EPSILON))
    && ((cdA > EPSILON && cdB < -EPSILON) || (cdA < -EPSILON && cdB > EPSILON))) {
    return true;
  }
  return (Math.abs(abC) <= EPSILON && onSegment(a, b, c))
    || (Math.abs(abD) <= EPSILON && onSegment(a, b, d))
    || (Math.abs(cdA) <= EPSILON && onSegment(c, d, a))
    || (Math.abs(cdB) <= EPSILON && onSegment(c, d, b));
}

function assertNoSelfIntersections(ring: Ring): void {
  const count = ring.length;
  for (let i = 0; i < count; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % count];
    for (let j = i + 1; j < count; j += 1) {
      // Adjacent edges share an intended endpoint; first and last are adjacent too.
      if (j === i || j === i + 1 || (i === 0 && j === count - 1)) continue;
      const c = ring[j];
      const d = ring[(j + 1) % count];
      if (segmentsIntersect(a, b, c, d)) {
        throw new Error(`Polygon edges ${i} and ${j} intersect or touch.`);
      }
    }
  }
}

function signedArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const current = ring[i];
    const next = ring[(i + 1) % ring.length];
    sum += current[0] * next[1] - next[0] * current[1];
  }
  return sum / 2;
}

/**
 * Validate an open polygon ring and return measurements from its canonical,
 * millimetre-quantized coordinates. Winding order is accepted in either direction.
 */
export function measurePolygon(input: unknown, options: GeometryOptions = {}): PlotMeasurements {
  if (!Array.isArray(input)) throw new Error("Ring must be an array of vertices.");
  if (input.length < 3) throw new Error("A polygon needs at least three vertices.");
  if (input.length > MAX_POLYGON_VERTICES) {
    throw new Error(`A polygon can contain at most ${MAX_POLYGON_VERTICES} vertices.`);
  }

  const raw = input as unknown[];
  raw.forEach((point, index) => assertPoint(point, index));

  if (samePoint(raw[0] as Point2D, raw[raw.length - 1] as Point2D)) {
    throw new Error("Ring must be open; do not repeat the first vertex at the end.");
  }

  const ring: Point2D[] = raw.map((point) => [
    roundHalfAwayFromZero((point as Point2D)[0]),
    roundHalfAwayFromZero((point as Point2D)[1]),
  ]);

  const minEdgeM = options.minEdgeM ?? DEFAULT_MIN_EDGE_M;
  const minAreaM2 = options.minAreaM2 ?? DEFAULT_MIN_AREA_M2;
  if (!Number.isFinite(minEdgeM) || minEdgeM < QUANTUM) {
    throw new Error("minEdgeM must be finite and at least 0.001 m.");
  }
  if (!Number.isFinite(minAreaM2) || minAreaM2 <= 0) {
    throw new Error("minAreaM2 must be a positive finite number.");
  }

  for (let i = 0; i < ring.length; i += 1) {
    const current = ring[i];
    const next = ring[(i + 1) % ring.length];
    if (samePoint(current, next)) {
      throw new Error(`Adjacent vertices ${i} and ${(i + 1) % ring.length} collapse after quantization.`);
    }
    if (Math.hypot(next[0] - current[0], next[1] - current[1]) + EPSILON < minEdgeM) {
      throw new Error(`Edge ${i} is shorter than the minimum ${minEdgeM} m.`);
    }
  }

  assertNoSelfIntersections(ring);
  const areaM2 = Math.abs(signedArea(ring));
  if (!Number.isFinite(areaM2) || areaM2 < minAreaM2) {
    throw new Error(`Polygon area must be at least ${minAreaM2} m².`);
  }

  let perimeterM = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const next = ring[(i + 1) % ring.length];
    perimeterM += Math.hypot(next[0] - ring[i][0], next[1] - ring[i][1]);
  }

  // 2A/P is an effective-width proxy: it rejects extremely thin slivers
  // without pretending to compute a true polygon inradius.
  const effectiveWidthM = (2 * areaM2) / perimeterM;
  if (effectiveWidthM + EPSILON < DEFAULT_MIN_EFFECTIVE_WIDTH_M) {
    throw new Error(`Polygon is too narrow; effective width must be at least ${DEFAULT_MIN_EFFECTIVE_WIDTH_M} m.`);
  }

  return {
    areaM2: Number(areaM2.toFixed(6)),
    perimeterM: Number(perimeterM.toFixed(6)),
    vertexCount: ring.length,
    ring,
  };
}
