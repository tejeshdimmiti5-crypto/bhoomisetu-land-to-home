import type { Point2D } from "./geometry";

export interface GeoOrigin {
  latitude: number;
  longitude: number;
}

function assertCoordinate(latitude: number, longitude: number): void {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error("GPS coordinates must be finite latitude/longitude values within valid ranges.");
  }
}

/**
 * Projects a GPS fix into local east/north metres around a fixed origin.
 * This equirectangular approximation is intended for small plots only, not surveying.
 */
export function projectGpsToLocal(origin: GeoOrigin, latitude: number, longitude: number): Point2D {
  assertCoordinate(origin.latitude, origin.longitude);
  assertCoordinate(latitude, longitude);

  const radians = Math.PI / 180;
  const earthRadiusM = 6371008.8;
  let longitudeDelta = longitude - origin.longitude;
  if (longitudeDelta > 180) longitudeDelta -= 360;
  if (longitudeDelta < -180) longitudeDelta += 360;

  const x = earthRadiusM * Math.cos(origin.latitude * radians) * longitudeDelta * radians;
  const y = earthRadiusM * (latitude - origin.latitude) * radians;
  return [Number(x.toFixed(3)), Number(y.toFixed(3))];
}
