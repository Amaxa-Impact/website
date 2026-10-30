import type { AnalyzeInput, AnalyzeResult } from "./types";
import { parseIsoDate } from "./dates";
import { projectSchedule } from "./execution";
import { buildPlan } from "./plan";
import { prepare } from "./prepare";
import { prioritise } from "./priority";

/**
 * Plans the project (critical chain, buffers, commitment), projects it from
 * today's progress, and ranks what to work on next. Pure: no I/O, no clock.
 */
export function analyze(input: AnalyzeInput): AnalyzeResult {
  const prepared = prepare(input.project, input.tasks, input.links);
  if (!prepared.ok) {
    return prepared;
  }

  let todayDay: number;
  try {
    todayDay = parseIsoDate(input.today) - prepared.prepared.startEpoch;
  } catch (error) {
    return {
      ok: false,
      error: {
        kind: "invalid_date",
        taskIds: [],
        message: `Today: ${(error as Error).message}`,
      },
    };
  }

  const plan = buildPlan(prepared.prepared);
  const { projection, warnings } = projectSchedule(
    prepared.prepared,
    plan,
    todayDay,
  );
  const priority = prioritise(prepared.prepared, plan, projection);

  return { ok: true, plan, projection, priority, warnings };
}

export { bufferSize } from "./buffers";
export {
  DEFAULT_BUFFER_METHOD,
  DEFAULT_SAFE_RATIO,
  MIN_FEEDING_BUFFER_DAYS,
  ZONE_LINES,
} from "./config";
export { addDays, diffInDays, formatIsoDate, parseIsoDate } from "./dates";
export { zoneFor } from "./execution";
export { validateGraph } from "./graph";
export type * from "./types";
