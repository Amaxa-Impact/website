import type { ChainView } from "./chain-view";

export interface SetupLink {
  source: string;
  target: string;
}

/** True when linking `from` before `to` would close a loop (to already leads to from). */
export function wouldCreateLoop(
  links: SetupLink[],
  from: string,
  to: string,
): boolean {
  if (from === to) {
    return true;
  }
  const next = new Map<string, string[]>();
  for (const link of links) {
    next.set(link.source, [...(next.get(link.source) ?? []), link.target]);
  }
  const seen = new Set<string>();
  const stack = [to];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined || seen.has(id)) continue;
    if (id === from) return true;
    seen.add(id);
    stack.push(...(next.get(id) ?? []));
  }
  return false;
}

export const LAYOUT_GAP = { x: 360, y: 200 };

/**
 * Left-to-right positions by dependency depth: a task sits one column right
 * of its deepest predecessor; tasks in a column keep the given order. Links
 * that form a loop are ignored so every task still gets a spot.
 */
export function layeredLayout(
  taskIds: string[],
  links: SetupLink[],
): Map<string, { x: number; y: number }> {
  const known = new Set(taskIds);
  const preds = new Map<string, string[]>();
  for (const link of links) {
    if (known.has(link.source) && known.has(link.target)) {
      preds.set(link.target, [...(preds.get(link.target) ?? []), link.source]);
    }
  }

  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const depthOf = (id: string): number => {
    const cached = depth.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const d = Math.max(-1, ...(preds.get(id) ?? []).map(depthOf)) + 1;
    visiting.delete(id);
    depth.set(id, d);
    return d;
  };

  const rows = new Map<number, number>();
  const positions = new Map<string, { x: number; y: number }>();
  for (const id of taskIds) {
    const column = depthOf(id);
    const row = rows.get(column) ?? 0;
    rows.set(column, row + 1);
    positions.set(id, { x: column * LAYOUT_GAP.x, y: row * LAYOUT_GAP.y });
  }
  return positions;
}

export interface SetupTask {
  id: string;
  label?: string;
  assignedTo?: string;
  bestDays?: number;
}

export interface SetupState {
  goal: string;
  startDate?: string;
  deadline?: string;
  tasks: SetupTask[];
  links: SetupLink[];
  chainView: ChainView | null;
  committedDate?: string;
}

export const SETUP_STEPS = [
  { key: "goal", title: "Goal and deadline" },
  { key: "tasks", title: "List the tasks" },
  { key: "links", title: "Link them" },
  { key: "owners", title: "Assign owners" },
  { key: "estimates", title: "Estimate" },
  { key: "review", title: "Review the chain" },
  { key: "commit", title: "Commit" },
] as const;

export type SetupStepKey = (typeof SETUP_STEPS)[number]["key"];

/** Which steps have what they need, for the checkmarks in the step list. */
export function completedSteps(state: SetupState): Set<SetupStepKey> {
  const done = new Set<SetupStepKey>();
  const hasTasks = state.tasks.length > 0;
  if (state.goal.trim() !== "" && state.startDate && state.deadline) {
    done.add("goal");
  }
  if (state.tasks.length >= 2) {
    done.add("tasks");
  }
  if (state.tasks.length >= 2 && state.links.length > 0) {
    done.add("links");
  }
  if (hasTasks && state.tasks.every((t) => t.assignedTo)) {
    done.add("owners");
  }
  if (hasTasks && state.tasks.every((t) => t.bestDays !== undefined)) {
    done.add("estimates");
  }
  if (state.chainView?.status === "ready" && state.startDate) {
    done.add("review");
    if (state.committedDate === state.chainView.commitment.date) {
      done.add("commit");
    }
  }
  return done;
}
