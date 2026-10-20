export type GpsAccuracyClass = "invalid" | "rejected" | "warning" | "acceptable";

export const GPS_ACCURACY_WARNING_METRES = 10;
export const GPS_ACCURACY_REJECT_METRES = 50;

/** Classify a browser-reported horizontal accuracy radius in metres. */
export function classifyGpsAccuracy(accuracy: number): GpsAccuracyClass {
  if (!Number.isFinite(accuracy) || accuracy < 0) return "invalid";
  if (accuracy > GPS_ACCURACY_REJECT_METRES) return "rejected";
  if (accuracy > GPS_ACCURACY_WARNING_METRES) return "warning";
  return "acceptable";
}
