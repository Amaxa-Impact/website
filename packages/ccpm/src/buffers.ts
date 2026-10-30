import type { BufferMethod } from "./types";
import { EPSILON } from "./config";

interface Estimate {
  best: number;
  safe: number;
}

/**
 * Buffer for a run of tasks, rounded up to whole days.
 * half: 0.5 x the sum of best-case days.
 * rss:  the square root of the sum of squared (safe - best) gaps.
 */
export function bufferSize(method: BufferMethod, tasks: Estimate[]): number {
  const raw =
    method === "half"
      ? 0.5 * tasks.reduce((sum, t) => sum + t.best, 0)
      : Math.sqrt(tasks.reduce((sum, t) => sum + (t.safe - t.best) ** 2, 0));
  return Math.max(0, Math.ceil(raw - EPSILON));
}
