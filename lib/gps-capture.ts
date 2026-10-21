import type { Point2D } from "./geometry";
import { projectGpsToLocal, type GeoOrigin } from "./gps-projection";

export type GpsAccuracyClass = "invalid" | "acceptable" | "rejected";

export const GPS_ACCURACY_MAX_METRES = 10;

export interface GpsFix {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GpsCandidate {
  point: Point2D;
  origin: GeoOrigin;
  accuracy: number;
  first: boolean;
}

export type GpsCandidateBuildResult =
  | { ok: true; candidate: GpsCandidate }
  | { ok: false; reason: "accuracy" | "coordinates" };

/** Classify a browser-reported horizontal accuracy radius in metres. */
export function classifyGpsAccuracy(accuracy: number): GpsAccuracyClass {
  if (Number.isFinite(accuracy) && accuracy > 0 && accuracy <= GPS_ACCURACY_MAX_METRES) {
    return "acceptable";
  }
  if (Number.isFinite(accuracy) && accuracy > GPS_ACCURACY_MAX_METRES) {
    return "rejected";
  }
  return "invalid";
}

/** Only fixes that meet the accuracy policy may become pending GPS candidates. */
export function isGpsCandidateEligible(cls: GpsAccuracyClass): boolean {
  return cls === "acceptable";
}

/**
 * Build a pending candidate only when both accuracy and all coordinates are valid.
 * This is pure: it never mutates the current origin or boundary.
 */
export function buildGpsCandidate(fix: GpsFix, existingOrigin: GeoOrigin | null): GpsCandidateBuildResult {
  if (!isGpsCandidateEligible(classifyGpsAccuracy(fix.accuracy))) {
    return { ok: false, reason: "accuracy" };
  }

  const first = existingOrigin === null;
  const origin = existingOrigin ?? { latitude: fix.latitude, longitude: fix.longitude };
  try {
    const point = projectGpsToLocal(origin, fix.latitude, fix.longitude);
    return { ok: true, candidate: { point, origin, accuracy: fix.accuracy, first } };
  } catch {
    return { ok: false, reason: "coordinates" };
  }
}

export const MAX_PLOT_VERTICES = 200;
export type PendingCandidateCheck = { ok: true } | { ok: false; reason: "stale-origin" | "vertex-limit" };
/** Pure confirm-time guard. editorStateMatches catches changes that leave GPS origin null. */
export function checkPendingGpsCandidate(candidate: GpsCandidate, currentOrigin: GeoOrigin | null, currentRingLength: number, editorStateMatches = true): PendingCandidateCheck {
  if (!editorStateMatches) return { ok: false, reason: "stale-origin" };
  if (candidate.first) return currentOrigin === null ? { ok: true } : { ok: false, reason: "stale-origin" };
  if (currentOrigin === null || currentOrigin.latitude !== candidate.origin.latitude || currentOrigin.longitude !== candidate.origin.longitude) {
    return { ok: false, reason: "stale-origin" };
  }
  if (currentRingLength + 1 > MAX_PLOT_VERTICES) return { ok: false, reason: "vertex-limit" };
  return { ok: true };
}
