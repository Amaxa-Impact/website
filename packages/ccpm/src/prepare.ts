import type {
  EngineError,
  EngineLink,
  EngineProject,
  EngineTask,
  ExcludedTask,
  TaskStatus,
} from "./types";
import { DEFAULT_BUFFER_METHOD, DEFAULT_SAFE_RATIO } from "./config";
import { parseIsoDate } from "./dates";
import { validateGraph } from "./graph";
import { must } from "./util";

export interface PreparedTask {
  id: string;
  title: string;
  ownerId: string | undefined;
  best: number;
  safe: number;
  status: TaskStatus;
  /** Day numbers relative to the project start (day 0). */
  actualStart: number | undefined;
  actualFinish: number | undefined;
  daysRemaining: number | undefined;
}

export interface Prepared {
  startDate: string;
  startEpoch: number;
  deadlineDay: number | undefined;
  method: "half" | "rss";
  /** Active tasks (everything except Unable to Complete). */
  tasks: Map<string, PreparedTask>;
  /** Topological order of the active tasks. */
  order: string[];
  preds: Map<string, string[]>;
  succs: Map<string, string[]>;
  excluded: ExcludedTask[];
}

export type PrepareResult =
  | { ok: true; prepared: Prepared }
  | { ok: false; error: EngineError };

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function invalidDate(taskIds: string[], message: string): PrepareResult {
  return { ok: false, error: { kind: "invalid_date", taskIds, message } };
}

/** Validates the input and converts it to day numbers. No scheduling yet. */
export function prepare(
  project: EngineProject,
  tasks: EngineTask[],
  links: EngineLink[],
): PrepareResult {
  let startEpoch: number;
  try {
    startEpoch = parseIsoDate(project.startDate);
  } catch (error) {
    return invalidDate([], `Project start date: ${(error as Error).message}`);
  }

  let deadlineDay: number | undefined;
  if (project.deadline !== undefined) {
    try {
      deadlineDay = parseIsoDate(project.deadline) - startEpoch;
    } catch (error) {
      return invalidDate([], `Project deadline: ${(error as Error).message}`);
    }
  }

  const ratio = project.safeRatio ?? DEFAULT_SAFE_RATIO;
  const excluded: ExcludedTask[] = tasks
    .filter((t) => t.status === "blocked")
    .map((t) => ({ taskId: t.id, reason: "unable_to_complete" as const }))
    .sort((a, b) => byId(a.taskId, b.taskId));
  const excludedIds = new Set(excluded.map((e) => e.taskId));
  const active = tasks.filter((t) => !excludedIds.has(t.id));

  const missing = active
    .filter(
      (t) =>
        t.bestDays === undefined ||
        !Number.isFinite(t.bestDays) ||
        t.bestDays <= 0,
    )
    .map((t) => t.id)
    .sort(byId);
  if (missing.length > 0) {
    return {
      ok: false,
      error: {
        kind: "missing_estimates",
        taskIds: missing,
        message: `These tasks need a best-case estimate: ${missing.join(", ")}`,
      },
    };
  }

  const prepared = new Map<string, PreparedTask>();
  for (const t of active) {
    const best = must(t.bestDays, `estimate for ${t.id}`);
    let actualStart: number | undefined;
    let actualFinish: number | undefined;
    try {
      if (t.actualStart !== undefined) {
        actualStart = parseIsoDate(t.actualStart) - startEpoch;
      }
      if (t.actualFinish !== undefined) {
        actualFinish = parseIsoDate(t.actualFinish) - startEpoch;
      }
    } catch (error) {
      return invalidDate([t.id], `Task ${t.id}: ${(error as Error).message}`);
    }
    prepared.set(t.id, {
      id: t.id,
      title: t.title?.trim() ? t.title : t.id,
      ownerId: t.ownerId,
      best,
      safe: Math.max(t.safeDays ?? best * ratio, best),
      status: t.status,
      actualStart,
      actualFinish,
      daysRemaining: t.daysRemaining,
    });
  }

  // Links must point at real tasks; links touching an excluded task are
  // dropped (that task no longer constrains anything).
  const known = new Set(tasks.map((t) => t.id));
  const unknown = new Set<string>();
  for (const link of links) {
    if (!known.has(link.from)) unknown.add(link.from);
    if (!known.has(link.to)) unknown.add(link.to);
  }
  if (unknown.size > 0) {
    const taskIds = [...unknown].sort(byId);
    return {
      ok: false,
      error: {
        kind: "unknown_task",
        taskIds,
        message: `Links refer to tasks that don't exist: ${taskIds.join(", ")}`,
      },
    };
  }

  const seen = new Set<string>();
  const activeLinks = links.filter((link) => {
    if (!prepared.has(link.from) || !prepared.has(link.to)) return false;
    const key = `${link.from}\u0000${link.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const graph = validateGraph(
    [...prepared.values()].map((t) => ({ id: t.id, title: t.title })),
    activeLinks,
  );
  if (!graph.ok) {
    return { ok: false, error: graph.error };
  }

  const preds = new Map<string, string[]>();
  const succs = new Map<string, string[]>();
  for (const id of prepared.keys()) {
    preds.set(id, []);
    succs.set(id, []);
  }
  for (const link of activeLinks) {
    preds.get(link.to)?.push(link.from);
    succs.get(link.from)?.push(link.to);
  }
  for (const list of [...preds.values(), ...succs.values()]) {
    list.sort(byId);
  }

  return {
    ok: true,
    prepared: {
      startDate: project.startDate,
      startEpoch,
      deadlineDay,
      method: project.bufferMethod ?? DEFAULT_BUFFER_METHOD,
      tasks: prepared,
      order: graph.order,
      preds,
      succs,
      excluded,
    },
  };
}
