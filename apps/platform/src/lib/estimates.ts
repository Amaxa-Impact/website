export const DEFAULT_SAFE_RATIO = 1.5;

const ONE_NUMBER = /^\d+(\.\d+)?$/;

export type DaysInput =
  | { ok: true; value: number | undefined }
  | { ok: false; error: string };

/**
 * Parses a "how many days" answer. One number only: blank means "not
 * answered", and ranges ("3-5"), lists, units and negatives are rejected.
 */
export function parseDays(text: string): DaysInput {
  const trimmed = text.trim();
  if (trimmed === "") {
    return { ok: true, value: undefined };
  }
  if (!ONE_NUMBER.test(trimmed)) {
    return { ok: false, error: "Enter one number of days, like 5." };
  }
  const value = Number(trimmed);
  if (value <= 0) {
    return { ok: false, error: "Enter a number greater than 0." };
  }
  return { ok: true, value };
}

export interface EstimateCheck {
  best: number | undefined;
  safe: number | undefined;
  bestError?: string;
  safeError?: string;
  valid: boolean;
}

/** Validates both answers together (safe can't be shorter than best). */
export function checkEstimates(
  bestText: string,
  safeText: string,
): EstimateCheck {
  const best = parseDays(bestText);
  const safe = parseDays(safeText);

  const result: EstimateCheck = {
    best: best.ok ? best.value : undefined,
    safe: safe.ok ? safe.value : undefined,
    valid: best.ok && safe.ok,
  };
  if (!best.ok) {
    result.bestError = best.error;
  }
  if (!safe.ok) {
    result.safeError = safe.error;
  }
  if (best.ok && safe.ok) {
    if (safe.value !== undefined && best.value === undefined) {
      result.bestError = "Add your best case too.";
      result.valid = false;
    } else if (
      best.value !== undefined &&
      safe.value !== undefined &&
      safe.value < best.value
    ) {
      result.safeError = "The safe number can't be less than your best case.";
      result.valid = false;
    }
  }
  return result;
}

/** What the safe estimate falls back to when left blank. */
export function defaultSafeDays(
  bestDays: number,
  ratio = DEFAULT_SAFE_RATIO,
): number {
  return Math.round(bestDays * ratio * 10) / 10;
}

/** "5 days", "1 day", "2.5 days". */
export function formatDays(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"}`;
}
