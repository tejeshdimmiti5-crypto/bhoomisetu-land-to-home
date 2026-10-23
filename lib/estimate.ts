export type EstimateRateOrigin = "user_quote" | "verified_source";

export interface EstimateLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitRateINR: number;
  rateOrigin: EstimateRateOrigin;
  sourceLabel: string;
  sourceDate: string;
  region: string;
  wastagePercent: number;
}

export interface EstimateInput {
  schemaVersion: 1;
  title: string;
  region: string;
  currency: "INR";
  items: EstimateLineItem[];
  exclusions: string[];
  preparedAt: string;
}

export interface EstimateResult {
  valid: boolean;
  errors: string[];
  currency: "INR";
  lineItems: Array<EstimateLineItem & {
    baseAmountINR: number;
    wastageAmountINR: number;
    totalINR: number;
  }>;
  subtotalINR: number;
  totalWastageINR: number;
  totalINR: number;
  coverage: "complete-input" | "no-line-items";
  disclaimer: string;
}

const MAX_ITEMS = 500;
const MAX_TEXT = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Deterministic arithmetic only; it never supplies or predicts market rates. */
export function calculateEstimate(input: unknown): EstimateResult {
  const errors: string[] = [];
  const empty: EstimateResult = {
    valid: false, errors, currency: "INR", lineItems: [], subtotalINR: 0,
    totalWastageINR: 0, totalINR: 0, coverage: "no-line-items",
    disclaimer: "Planning estimate only. Rates and quantities require independent review; this is not a contractor quote or guarantee.",
  };
  if (!isRecord(input)) return { ...empty, errors: ["Estimate must be an object."] };
  if (input.schemaVersion !== 1) errors.push("Unsupported estimate schema version.");
  if (!nonEmpty(input.title) || input.title.length > MAX_TEXT) errors.push("Estimate title must contain 1–200 characters.");
  if (!nonEmpty(input.region) || input.region.length > MAX_TEXT) errors.push("Estimate region must contain 1–200 characters.");
  if (input.currency !== "INR") errors.push("Only INR is supported by this estimate schema.");
  if (!nonEmpty(input.preparedAt) || !Number.isFinite(Date.parse(input.preparedAt))) errors.push("Prepared date must be a valid date string.");
  if (!Array.isArray(input.items)) errors.push("Estimate items must be an array.");
  const items = Array.isArray(input.items) ? input.items : [];
  if (items.length > MAX_ITEMS) errors.push(`An estimate can contain at most ${MAX_ITEMS} line items.`);
  if (!Array.isArray(input.exclusions) || !input.exclusions.every(nonEmpty)) errors.push("Exclusions must be an array of non-empty strings.");
  const ids = new Set<string>();
  const validItems: EstimateLineItem[] = [];
  items.forEach((raw, index) => {
    if (!isRecord(raw)) { errors.push(`Item ${index + 1} must be an object.`); return; }
    const item = raw as unknown as Partial<EstimateLineItem>;
    if (!nonEmpty(item.id)) errors.push(`Item ${index + 1} needs an ID.`);
    else if (ids.has(item.id)) errors.push(`Duplicate estimate item ID “${item.id}”.`);
    else ids.add(item.id);
    if (!nonEmpty(item.description) || item.description.length > MAX_TEXT) errors.push(`Item ${index + 1} needs a description of at most 200 characters.`);
    if (!nonEmpty(item.unit) || item.unit.length > 40) errors.push(`Item ${index + 1} needs a unit.`);
    if (!finite(item.quantity) || item.quantity <= 0) errors.push(`Item ${index + 1} quantity must be a finite number greater than zero.`);
    if (!finite(item.unitRateINR) || item.unitRateINR < 0) errors.push(`Item ${index + 1} rate must be a finite, non-negative number.`);
    if (item.rateOrigin !== "user_quote" && item.rateOrigin !== "verified_source") errors.push(`Item ${index + 1} needs an explicit rate origin.`);
    if (!nonEmpty(item.sourceLabel) || item.sourceLabel.length > MAX_TEXT) errors.push(`Item ${index + 1} needs a source label.`);
    if (!nonEmpty(item.sourceDate) || !Number.isFinite(Date.parse(item.sourceDate))) errors.push(`Item ${index + 1} needs a valid source date.`);
    if (!nonEmpty(item.region) || item.region.length > MAX_TEXT) errors.push(`Item ${index + 1} needs a rate region.`);
    if (!finite(item.wastagePercent) || item.wastagePercent < 0 || item.wastagePercent > 100) errors.push(`Item ${index + 1} wastage must be between 0 and 100 percent.`);
    if (
      nonEmpty(item.id) && nonEmpty(item.description) && item.description.length <= MAX_TEXT &&
      nonEmpty(item.unit) && item.unit.length <= 40 && finite(item.quantity) && item.quantity > 0 &&
      finite(item.unitRateINR) && item.unitRateINR >= 0 &&
      (item.rateOrigin === "user_quote" || item.rateOrigin === "verified_source") &&
      nonEmpty(item.sourceLabel) && item.sourceLabel.length <= MAX_TEXT &&
      nonEmpty(item.sourceDate) && Number.isFinite(Date.parse(item.sourceDate)) &&
      nonEmpty(item.region) && item.region.length <= MAX_TEXT &&
      finite(item.wastagePercent) && item.wastagePercent >= 0 && item.wastagePercent <= 100
    ) {
      validItems.push(item as EstimateLineItem);
    }
  });
  if (errors.length) return { ...empty, errors };
  const lineItems = validItems.map((item) => {
    const baseAmountINR = item.quantity * item.unitRateINR;
    const wastageAmountINR = baseAmountINR * item.wastagePercent / 100;
    return { ...item, baseAmountINR, wastageAmountINR, totalINR: baseAmountINR + wastageAmountINR };
  });
  if (lineItems.some((item) =>
    !Number.isFinite(item.baseAmountINR) ||
    !Number.isFinite(item.wastageAmountINR) ||
    !Number.isFinite(item.totalINR)
  )) {
    return { ...empty, errors: ["Calculated line-item total exceeds the supported numeric range. Reduce the quantity or rate."] };
  }
  const subtotalINR = lineItems.reduce((sum, item) => sum + item.baseAmountINR, 0);
  const totalWastageINR = lineItems.reduce((sum, item) => sum + item.wastageAmountINR, 0);
  const totalINR = subtotalINR + totalWastageINR;
  if (![subtotalINR, totalWastageINR, totalINR].every(Number.isFinite)) {
    return { ...empty, errors: ["Calculated estimate total exceeds the supported numeric range. Reduce quantities, rates, or line items."] };
  }
  return {
    valid: true, errors: [], currency: "INR", lineItems, subtotalINR, totalWastageINR,
    totalINR,
    coverage: lineItems.length ? "complete-input" : "no-line-items",
    disclaimer: "Planning estimate only. Rates and quantities require independent review; this is not a contractor quote or guarantee.",
  };
}
