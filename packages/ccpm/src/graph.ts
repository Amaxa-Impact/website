import type { EngineError, EngineLink } from "./types";

interface Node {
  id: string;
  title?: string;
}

export type GraphResult =
  | { ok: true; order: string[] }
  | { ok: false; error: EngineError };

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function label(node: Node | undefined, id: string): string {
  return node?.title?.trim() ? node.title : id;
}

/**
 * Checks that links point at known tasks and form a DAG, and returns a
 * deterministic topological order (ties broken by task id).
 */
export function validateGraph(nodes: Node[], links: EngineLink[]): GraphResult {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const unknown = new Set<string>();
  for (const link of links) {
    if (!nodeById.has(link.from)) unknown.add(link.from);
    if (!nodeById.has(link.to)) unknown.add(link.to);
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

  const successors = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const node of nodes) {
    successors.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  for (const link of links) {
    successors.get(link.from)?.push(link.to);
    inDegree.set(link.to, (inDegree.get(link.to) ?? 0) + 1);
  }

  // Kahn's algorithm; always take the smallest ready id so the order is stable.
  const ready = [...inDegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([id]) => id)
    .sort(byId);
  const order: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift();
    if (id === undefined) break;
    order.push(id);
    for (const next of successors.get(id) ?? []) {
      const degree = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, degree);
      if (degree === 0) {
        ready.push(next);
        ready.sort(byId);
      }
    }
  }

  if (order.length === nodes.length) {
    return { ok: true, order };
  }

  const cycle = findCycle(
    nodes.map((n) => n.id).filter((id) => !order.includes(id)),
    successors,
  );
  const names = cycle.map((id) => label(nodeById.get(id), id));
  return {
    ok: false,
    error: {
      kind: "cycle",
      taskIds: cycle,
      message: `These tasks depend on each other in a loop: ${[...names, names[0]].join(" → ")}`,
    },
  };
}

/** Finds one cycle among the tasks Kahn's algorithm couldn't order. */
function findCycle(
  stuck: string[],
  successors: Map<string, string[]>,
): string[] {
  const inStuck = new Set(stuck);
  const state = new Map<string, "visiting" | "done">();
  const path: string[] = [];

  const visit = (id: string): string[] | null => {
    state.set(id, "visiting");
    path.push(id);
    for (const next of [...(successors.get(id) ?? [])].sort(byId)) {
      if (!inStuck.has(next)) continue;
      if (state.get(next) === "visiting") {
        return path.slice(path.indexOf(next));
      }
      if (!state.has(next)) {
        const found = visit(next);
        if (found) return found;
      }
    }
    path.pop();
    state.set(id, "done");
    return null;
  };

  for (const id of [...stuck].sort(byId)) {
    if (!state.has(id)) {
      const found = visit(id);
      if (found) return found;
    }
  }
  return stuck;
}
