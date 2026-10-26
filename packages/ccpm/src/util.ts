/**
 * Unwraps a value the engine has already guaranteed exists (a task id taken
 * from its own maps, an array index within bounds). Throws if that guarantee
 * is ever broken, instead of papering over it.
 */
export function must<T>(value: T | null | undefined, what = "value"): T {
  if (value === null || value === undefined) {
    throw new Error(`ccpm: expected ${what} to exist`);
  }
  return value;
}
