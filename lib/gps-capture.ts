export type GpsAccuracyClass = "invalid" | "acceptable" | "rejected";

export const GPS_ACCURACY_MAX_METRES = 10;

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
