import type { BufferMethod } from "./types";

export const DEFAULT_BUFFER_METHOD: BufferMethod = "half";

/** safe = best x ratio when a task has no safe estimate. */
export const DEFAULT_SAFE_RATIO = 1.5;

/** A feeding buffer is never smaller than this many days. */
export const MIN_FEEDING_BUFFER_DAYS = 3;

/**
 * Fever-chart zone boundaries, as the y value (% buffer used) at x = 0% and
 * x = 100% (% chain complete). At or below the green line is green, at or
 * above the red line is red, between is yellow.
 */
export const ZONE_LINES = {
  green: { at0: 0, at100: 60 },
  red: { at0: 30, at100: 90 },
} as const;

/** Tolerance for comparing day counts that may be fractional. */
export const EPSILON = 1e-9;
