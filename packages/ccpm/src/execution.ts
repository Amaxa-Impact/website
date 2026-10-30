import type { Prepared, PreparedTask } from "./prepare";
import type {
  FeedingBufferUse,
  Plan,
  ProjectedTask,
  Projection,
  Warning,
  Zone,
} from "./types";
import { ZONE_LINES } from "./config";
import { formatIsoDate } from "./dates";
import { must } from "./util";

/** y (% buffer used) on a zone boundary line at x (% chain complete). */
function lineAt(line: { at0: number; at100: number }, x: number): number {
  return line.at0 + ((line.at100 - line.at0) * x) / 100;
}

export function zoneFor(chainCompletePct: number, bufferUsedPct: number): Zone {
  if (bufferUsedPct <= lineAt(ZONE_LINES.green, chainCompletePct)) {
    return "green";
  }
  if (bufferUsedPct >= lineAt(ZONE_LINES.red, chainCompletePct)) {
    return "red";
  }
  return "yellow";
}

// A waiting task that has been started keeps its own estimate; one that hasn't
// is treated as not started.
function isStarted(t: PreparedTask): boolean {
  return (
    t.status === "in_progress" ||
    (t.status === "waiting" &&
      (t.actualStart !== undefined || t.daysRemaining !== undefined))
  );
}

function usedPct(usedDays: number, sizeDays: number): number {
  if (sizeDays > 0) {
    return (Math.max(0, usedDays) / sizeDays) * 100;
  }
  return usedDays > 0 ? 100 : 0;
}

/**
 * Where each task is projected to land given today's progress, and what that
 * does to the buffers. `todayDay` is today as a day number from the project
 * start.
 */
export function projectSchedule(
  p: Prepared,
  plan: Plan,
  todayDay: number,
): { projection: Projection; warnings: Warning[] } {
  const now = Math.max(todayDay, 0);
  const warnings: Warning[] = [];
  const tasks: Record<string, ProjectedTask> = {};

  for (const id of p.order) {
    const t = must(p.tasks.get(id), `task ${id}`);

    if (t.status === "completed") {
      if (t.actualFinish === undefined) {
        warnings.push({
          code: "missing_actual_finish",
          taskId: id,
          message: `"${t.title}" is done but has no finish date; assuming today.`,
        });
      }
      const finish = t.actualFinish ?? now;
      tasks[id] = { id, start: t.actualStart ?? finish, finish, remaining: 0 };
      continue;
    }

    if (isStarted(t)) {
      if (t.actualStart === undefined) {
        warnings.push({
          code: "missing_actual_start",
          taskId: id,
          message: `"${t.title}" is in progress but has no start date; assuming today.`,
        });
      }
      const startDay = t.actualStart ?? now;
      const elapsed = Math.max(now - startDay, 0);
      if (t.daysRemaining === undefined) {
        warnings.push({
          code: "missing_days_remaining",
          taskId: id,
          message: `"${t.title}" has no days remaining; using its estimate minus time elapsed.`,
        });
      }
      const remaining = t.daysRemaining ?? Math.max(t.best - elapsed, 0);
      tasks[id] = { id, start: startDay, finish: now + remaining, remaining };
      continue;
    }

    const startDay = (p.preds.get(id) ?? []).reduce(
      (latest, pred) => Math.max(latest, tasks[pred]?.finish ?? 0),
      now,
    );
    tasks[id] = {
      id,
      start: startDay,
      finish: startDay + t.best,
      remaining: t.best,
    };
  }

  const lastChainId = plan.chain[plan.chain.length - 1];
  const chainProjectedFinish =
    lastChainId === undefined ? 0 : (tasks[lastChainId]?.finish ?? 0);
  const bufferUsedDays = chainProjectedFinish - plan.chainDays;
  const bufferUsedPct = usedPct(bufferUsedDays, plan.projectBufferDays);

  const feedingBufferUse: FeedingBufferUse[] = plan.feedingBuffers.map((fb) => {
    const used = (tasks[fb.endTaskId]?.finish ?? 0) - fb.plannedFinish;
    return {
      id: fb.id,
      usedDays: used,
      usedPct: usedPct(used, fb.sizeDays),
    };
  });

  // Chain complete %: best-case days of finished work over the whole chain.
  let credit = 0;
  for (const id of plan.chain) {
    const t = must(p.tasks.get(id), `task ${id}`);
    const projected = must(tasks[id], `projection for ${id}`);
    if (t.status === "completed") {
      credit += t.best;
    } else if (isStarted(t)) {
      const elapsed = Math.max(now - projected.start, 0);
      const fraction =
        projected.remaining <= 0
          ? 1
          : elapsed / (elapsed + projected.remaining);
      credit += t.best * Math.min(1, fraction);
    }
  }
  const chainCompletePct =
    plan.chainDays > 0 ? (credit / plan.chainDays) * 100 : 0;

  const earliestDay = chainProjectedFinish;
  const latestDay = Math.max(chainProjectedFinish, plan.commitment.day);
  const dateOf = (day: number) => formatIsoDate(p.startEpoch + day);

  return {
    warnings,
    projection: {
      today: now,
      tasks,
      chainProjectedFinish,
      bufferUsedDays,
      bufferUsedPct,
      feedingBufferUse,
      chainCompletePct,
      zone: zoneFor(chainCompletePct, bufferUsedPct),
      finish: {
        earliestDay,
        latestDay,
        earliest: dateOf(earliestDay),
        latest: dateOf(latestDay),
        ...(p.deadlineDay === undefined
          ? {}
          : {
              earliestVsDeadline: earliestDay - p.deadlineDay,
              latestVsDeadline: latestDay - p.deadlineDay,
            }),
      },
    },
  };
}
