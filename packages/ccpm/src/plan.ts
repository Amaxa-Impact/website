import type { Prepared } from "./prepare";
import type { FeedingBuffer, OwnerConflict, Plan, PlannedTask } from "./types";
import { bufferSize } from "./buffers";
import { EPSILON, MIN_FEEDING_BUFFER_DAYS } from "./config";
import { formatIsoDate } from "./dates";
import { must } from "./util";

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The baseline plan: everything scheduled as early as possible from the
 * project start using best-case days, then the critical chain, buffers,
 * owner conflicts and the commitment date derived from it.
 */
export function buildPlan(p: Prepared): Plan {
  const task = (id: string) => must(p.tasks.get(id), `task ${id}`);
  const dateOf = (day: number) => formatIsoDate(p.startEpoch + day);

  // Forward pass.
  const start = new Map<string, number>();
  const finish = new Map<string, number>();
  for (const id of p.order) {
    const earliest = (p.preds.get(id) ?? []).reduce(
      (latest, pred) => Math.max(latest, finish.get(pred) ?? 0),
      0,
    );
    start.set(id, earliest);
    finish.set(id, earliest + task(id).best);
  }

  const chain = traceChain(p, start, finish);
  const onChain = new Set(chain);
  const chainDays = chain.reduce((sum, id) => sum + task(id).best, 0);
  const projectBufferDays = bufferSize(
    p.method,
    chain.map((id) => task(id)),
  );

  const feedingBuffers = buildFeedingBuffers(p, chain, onChain, start, dateOf);

  const tasks: Record<string, PlannedTask> = {};
  for (const id of p.order) {
    const s = start.get(id) ?? 0;
    const f = finish.get(id) ?? 0;
    tasks[id] = {
      id,
      start: s,
      finish: f,
      startDate: dateOf(s),
      finishDate: dateOf(f),
      onChain: onChain.has(id),
    };
  }

  const commitmentDay = chainDays + projectBufferDays;
  const daysOverDeadline =
    p.deadlineDay === undefined
      ? 0
      : Math.max(0, commitmentDay - p.deadlineDay);

  return {
    startDate: p.startDate,
    tasks,
    chain,
    chainDays,
    projectBufferDays,
    feedingBuffers,
    commitment: {
      day: commitmentDay,
      date: dateOf(commitmentDay),
      afterDeadline: daysOverDeadline > 0,
      daysOverDeadline,
    },
    ownerConflicts: findOwnerConflicts(p, start, finish),
    excluded: p.excluded,
  };
}

/** Longest path by best-case days. Ties go to the lowest task id. */
function traceChain(
  p: Prepared,
  start: Map<string, number>,
  finish: Map<string, number>,
): string[] {
  let end: string | undefined;
  let endFinish = -Infinity;
  for (const id of [...p.tasks.keys()].sort(byId)) {
    const f = finish.get(id) ?? 0;
    if (f > endFinish + EPSILON) {
      end = id;
      endFinish = f;
    }
  }
  if (end === undefined) {
    return [];
  }

  const chain = [end];
  let current = end;
  for (;;) {
    const s = start.get(current) ?? 0;
    // Preds are sorted by id, so the first match is the lowest id.
    const critical = (p.preds.get(current) ?? []).find(
      (pred) => Math.abs((finish.get(pred) ?? 0) - s) < EPSILON,
    );
    if (critical === undefined) {
      break;
    }
    chain.push(critical);
    current = critical;
  }
  return chain.reverse();
}

function buildFeedingBuffers(
  p: Prepared,
  chain: string[],
  onChain: Set<string>,
  start: Map<string, number>,
  dateOf: (day: number) => string,
): FeedingBuffer[] {
  const task = (id: string) => must(p.tasks.get(id), `task ${id}`);

  // Longest non-chain path ending at each non-chain task.
  const length = new Map<string, number>();
  const previous = new Map<string, string | undefined>();
  for (const id of p.order) {
    if (onChain.has(id)) continue;
    let bestPred: string | undefined;
    let bestLength = 0;
    for (const pred of p.preds.get(id) ?? []) {
      if (onChain.has(pred)) continue;
      const len = length.get(pred) ?? 0;
      if (len > bestLength + EPSILON) {
        bestLength = len;
        bestPred = pred;
      }
    }
    length.set(id, task(id).best + bestLength);
    previous.set(id, bestPred);
  }

  const buffers: FeedingBuffer[] = [];
  for (const mergeId of chain) {
    for (const endId of p.preds.get(mergeId) ?? []) {
      if (onChain.has(endId)) continue;

      const taskIds: string[] = [];
      for (let id: string | undefined = endId; id; id = previous.get(id)) {
        taskIds.unshift(id);
      }
      const lengthDays = length.get(endId) ?? 0;
      const sizeDays = Math.max(
        MIN_FEEDING_BUFFER_DAYS,
        bufferSize(
          p.method,
          taskIds.map((id) => task(id)),
        ),
      );
      const earliest = start.get(must(taskIds[0], "feeding chain start")) ?? 0;
      const latestStart = (start.get(mergeId) ?? 0) - sizeDays - lengthDays;
      const startNow = latestStart < earliest - EPSILON;

      buffers.push({
        id: `${mergeId}:${endId}`,
        mergeTaskId: mergeId,
        endTaskId: endId,
        taskIds,
        lengthDays,
        sizeDays,
        latestStart,
        latestStartDate: dateOf(Math.max(latestStart, earliest)),
        startNow,
        plannedFinish: Math.max(latestStart, earliest) + lengthDays,
      });
    }
  }
  return buffers;
}

/** Owners with two tasks whose planned windows overlap. Flag only. */
function findOwnerConflicts(
  p: Prepared,
  start: Map<string, number>,
  finish: Map<string, number>,
): OwnerConflict[] {
  const byOwner = new Map<string, string[]>();
  for (const t of p.tasks.values()) {
    if (t.ownerId === undefined) continue;
    byOwner.set(t.ownerId, [...(byOwner.get(t.ownerId) ?? []), t.id]);
  }

  const conflicts: OwnerConflict[] = [];
  for (const ownerId of [...byOwner.keys()].sort(byId)) {
    const ids = [...(byOwner.get(ownerId) ?? [])].sort(
      (a, b) => (start.get(a) ?? 0) - (start.get(b) ?? 0) || byId(a, b),
    );
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = must(ids[i], "task id");
        const b = must(ids[j], "task id");
        if (
          (start.get(a) ?? 0) < (finish.get(b) ?? 0) - EPSILON &&
          (start.get(b) ?? 0) < (finish.get(a) ?? 0) - EPSILON
        ) {
          conflicts.push({ ownerId, taskIds: [a, b] });
        }
      }
    }
  }
  return conflicts;
}
