/**
 * Versioned area-unit definitions for BhoomiSetu.
 *
 * SI factors for ft², yd² and the international acre follow NIST Handbook 133
 * (2025), Appendix E: https://www.nist.gov/document/2025-nist-handbook-133-appendix-e
 * Cent and gunta are defined here as 1/100 and 1/40 of an international acre.
 * The Andhra Pradesh usage (1 gunta = 1,089 ft² = 121 yd²) is cross-checked
 * against https://landsizeconverter.com/land-measurement-in-andhra-pradesh/
 * Regional records and local practice take precedence where a local convention differs.
 *
 * Definition set: bhoomisetu-area-units-v1
 */

export const AREA_UNIT_DEFINITION_VERSION = "bhoomisetu-area-units-v1" as const;

export const AREA_UNIT_FACTORS_M2 = {
  m2: 1,
  ft2: 0.09290304,
  yd2: 0.83612736,
  acre: 4046.8564224,
  cent: 40.468564224,
  gunta: 101.17141056,
} as const;

export type AreaUnit = keyof typeof AREA_UNIT_FACTORS_M2;

export const AREA_UNIT_LABELS: Record<AreaUnit, string> = {
  m2: "square metre",
  ft2: "square foot",
  yd2: "square yard",
  acre: "acre",
  cent: "cent",
  gunta: "gunta",
};

/** Convert an area value to square metres without rounding the stored result. */
export function areaToSquareMetres(value: number, unit: AreaUnit): number {
  assertFiniteArea(value);
  return value * AREA_UNIT_FACTORS_M2[unit];
}

/** Convert between supported area units; callers control display rounding. */
export function convertArea(value: number, from: AreaUnit, to: AreaUnit): number {
  return areaToSquareMetres(value, from) / AREA_UNIT_FACTORS_M2[to];
}

function assertFiniteArea(value: number): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("Area must be a finite, non-negative number.");
  }
}
