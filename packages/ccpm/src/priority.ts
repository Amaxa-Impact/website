import type { Prepared } from "./prepare";
import type {
  FeedingBuffer,
  OwnerPriority,
  Plan,
  PriorityResult,
  Projection,
  RankedTask,
} from "./types";
import { must } from "./util";

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const CHAIN_REASON =
  "It's on the critical chain; a day late here is a day late for the project.";

/**
 * Ranks open tasks and picks one next task per owner.
 *
 * Ranking: on the critical chain first, then the most-used feeding buffer,
 * then the earliest projected start. For each owner we pick the highest-ranked
 * task they can start now (all predecessors done), falling back to the
 * highest-ranked one otherwise. An owner who is Waiting on someone is never
 * pointed at the waiting task or anything that depends on it.
 */
export function prioritise(
  p: Prepared,
  plan: Plan,
  projection: Projection,
): PriorityResult {
  const title = (id: string) => must(p.tasks.get(id), `task ${id}`).title;

  const usedByBuffer = new Map(
    projection.feedingBufferUse.map((u) => [u.id, u.usedPct]),
  );
  const bufferFor = (taskId: string): FeedingBuffer | undefined =>
    plan.feedingBuffers
      .filter((fb) => fb.taskIds.includes(taskId))
      .sort(
        (a, b) =>
          (usedByBuffer.get(b.id) ?? 0) - (usedByBuffer.get(a.id) ?? 0) ||
          byId(a.id, b.id),
      )[0];

  const ranked: RankedTask[] = [...p.tasks.values()]
    .filter((t) => t.status !== "completed")
    .map((t) => {
      const buffer = bufferFor(t.id);
      return {
        taskId: t.id,
        onChain: plan.tasks[t.id]?.onChain ?? false,
        feedingBufferUsedPct: buffer ? (usedByBuffer.get(buffer.id) ?? 0) : 0,
        projectedStart: projection.tasks[t.id]?.start ?? 0,
        ready: (p.preds.get(t.id) ?? []).every(
          (pred) => p.tasks.get(pred)?.status === "completed",
        ),
      };
    })
    .sort(
      (a, b) =>
        Number(b.onChain) - Number(a.onChain) ||
        b.feedingBufferUsedPct - a.feedingBufferUsedPct ||
        a.projectedStart - b.projectedStart ||
        byId(a.taskId, b.taskId),
    );

  const downstream = (rootId: string): Set<string> => {
    const seen = new Set<string>();
    const stack = [...(p.succs.get(rootId) ?? [])];
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === undefined) break;
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push(...(p.succs.get(id) ?? []));
    }
    return seen;
  };

  const reasonFor = (r: RankedTask): string => {
    if (!r.ready) {
      const open = (p.preds.get(r.taskId) ?? []).filter(
        (pred) => p.tasks.get(pred)?.status !== "completed",
      );
      const names = open.map((id) => `"${title(id)}"`).join(", ");
      return `Up next once ${names} ${open.length > 1 ? "are" : "is"} done.`;
    }
    if (r.onChain) {
      return CHAIN_REASON;
    }
    const buffer = bufferFor(r.taskId);
    if (buffer && r.feedingBufferUsedPct > 0) {
      return `It feeds "${title(buffer.mergeTaskId)}" and that feeding buffer is ${Math.round(r.feedingBufferUsedPct)}% used.`;
    }
    if (buffer) {
      return `It feeds "${title(buffer.mergeTaskId)}"; keep it moving to protect the plan.`;
    }
    return "Nothing is more urgent right now.";
  };

  const owners = [
    ...new Set(
      ranked
        .map((r) => p.tasks.get(r.taskId)?.ownerId)
        .filter((o): o is string => o !== undefined),
    ),
  ].sort(byId);

  const byOwner: OwnerPriority[] = owners.map((ownerId) => {
    const mine = ranked.filter(
      (r) => p.tasks.get(r.taskId)?.ownerId === ownerId,
    );
    const waiting = mine.filter(
      (r) => p.tasks.get(r.taskId)?.status === "waiting",
    );
    const blocked = new Set<string>();
    for (const w of waiting) {
      blocked.add(w.taskId);
      for (const id of downstream(w.taskId)) blocked.add(id);
    }

    const candidates = mine.filter((r) => !blocked.has(r.taskId));
    const pick = candidates.find((r) => r.ready) ?? candidates[0];
    if (!pick) {
      const first = waiting[0];
      return {
        ownerId,
        taskId: null,
        ready: false,
        reason: first
          ? `Everything else depends on "${title(first.taskId)}"; follow up on it.`
          : "Nothing left to do.",
      };
    }
    return {
      ownerId,
      taskId: pick.taskId,
      ready: pick.ready,
      reason: reasonFor(pick),
    };
  });

  return { ranked, byOwner };
}
