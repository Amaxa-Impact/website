import type { BufferMethod, TaskStatus } from "@amaxa/ccpm";
import { analyze } from "@amaxa/ccpm";

export interface ChainTaskInput {
  id: string;
  data: {
    label?: string;
    status?: TaskStatus;
    assignedTo?: string;
    bestDays?: number;
    safeDays?: number;
    actualStart?: string;
    actualFinish?: string;
    daysRemaining?: number;
  };
}

export interface ChainLinkInput {
  source: string;
  target: string;
}

export interface ChainProjectInput {
  startDate?: string;
  deadline?: string;
  bufferMethod?: BufferMethod;
  safeRatio?: number;
}

export interface FeedingBufferView {
  id: string;
  /** The last feeding task, and the chain task it joins. */
  endTaskId: string;
  mergeTaskId: string;
  /** The feeding chain's tasks in order. */
  taskIds: string[];
  sizeDays: number;
  startNow: boolean;
  latestStartDate: string;
}

export type ChainView =
  | {
      status: "ready";
      chain: string[];
      chainDays: number;
      projectBufferDays: number;
      feedingBuffers: FeedingBufferView[];
      /** linkKey(from, to) for each link between consecutive chain tasks. */
      chainLinks: Set<string>;
      /** Task id -> names of same-owner tasks planned at the same time. */
      overlaps: Map<string, string[]>;
      /** False when the project has no start date, so planned dates mean nothing. */
      datesKnown: boolean;
      /** Projected chain finish (earliest) to the end of the buffer (latest). */
      finish: { earliest: string; latest: string };
      /** Start + chain + project buffer: the date the team can commit to. */
      commitment: { date: string; daysOverDeadline: number };
      /** Tasks whose progress details the projection had to guess around. */
      progressWarnings: { taskId: string; message: string }[];
    }
  | { status: "empty" }
  | { status: "needs_estimates"; taskIds: string[] }
  | { status: "cycle"; taskIds: string[]; message: string }
  | { status: "error"; message: string };

export const linkKey = (from: string, to: string) => `${from}->${to}`;

/** "Mar 2", or "Mar 2, 2027" outside the current year. */
export function formatPlanDate(iso: string, today = localIsoDate()): string {
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}

/** Today's local date as YYYY-MM-DD. */
export function localIsoDate(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Runs the scheduling engine on the canvas's tasks and links. */
export function buildChainView({
  project,
  tasks,
  links,
  today,
}: {
  project: ChainProjectInput;
  tasks: ChainTaskInput[];
  links: ChainLinkInput[];
  today: string;
}): ChainView {
  if (tasks.length === 0) {
    return { status: "empty" };
  }

  // Chain shape and buffer sizes don't depend on the start date, so a project
  // without one still gets them; only the dates are meaningless.
  const result = analyze({
    project: {
      startDate: project.startDate ?? today,
      ...(project.deadline === undefined ? {} : { deadline: project.deadline }),
      ...(project.bufferMethod === undefined
        ? {}
        : { bufferMethod: project.bufferMethod }),
      ...(project.safeRatio === undefined
        ? {}
        : { safeRatio: project.safeRatio }),
    },
    tasks: tasks.map(({ id, data }) => ({
      id,
      title: data.label,
      // "" means "No owner yet".
      ownerId: data.assignedTo === "" ? undefined : data.assignedTo,
      bestDays: data.bestDays,
      safeDays: data.safeDays,
      status: data.status ?? "todo",
      actualStart: data.actualStart,
      actualFinish: data.actualFinish,
      daysRemaining: data.daysRemaining,
    })),
    links: links.map((link) => ({ from: link.source, to: link.target })),
    today,
  });

  if (!result.ok) {
    const { error } = result;
    if (error.kind === "missing_estimates") {
      return { status: "needs_estimates", taskIds: error.taskIds };
    }
    if (error.kind === "cycle") {
      return {
        status: "cycle",
        taskIds: error.taskIds,
        message: error.message,
      };
    }
    return { status: "error", message: error.message };
  }

  const { plan, projection, warnings } = result;
  if (plan.chain.length === 0) {
    return { status: "empty" };
  }

  const chainLinks = new Set<string>();
  for (let i = 1; i < plan.chain.length; i++) {
    chainLinks.add(linkKey(plan.chain[i - 1] ?? "", plan.chain[i] ?? ""));
  }

  const nameOf = new Map(
    tasks.map((t) => {
      const name = t.data.label?.trim() ?? "";
      return [t.id, name === "" ? "Untitled task" : name];
    }),
  );
  const overlaps = new Map<string, string[]>();
  for (const { taskIds } of plan.ownerConflicts) {
    const [a, b] = taskIds;
    overlaps.set(a, [...(overlaps.get(a) ?? []), nameOf.get(b) ?? b]);
    overlaps.set(b, [...(overlaps.get(b) ?? []), nameOf.get(a) ?? a]);
  }

  return {
    status: "ready",
    chain: plan.chain,
    chainDays: plan.chainDays,
    projectBufferDays: plan.projectBufferDays,
    feedingBuffers: plan.feedingBuffers.map((fb) => ({
      id: fb.id,
      endTaskId: fb.endTaskId,
      mergeTaskId: fb.mergeTaskId,
      taskIds: fb.taskIds,
      sizeDays: fb.sizeDays,
      startNow: fb.startNow,
      latestStartDate: fb.latestStartDate,
    })),
    chainLinks,
    overlaps,
    datesKnown: project.startDate !== undefined,
    finish: {
      earliest: projection.finish.earliest,
      latest: projection.finish.latest,
    },
    commitment: {
      date: plan.commitment.date,
      daysOverDeadline: plan.commitment.daysOverDeadline,
    },
    progressWarnings: warnings.map(({ taskId, message }) => ({
      taskId,
      message,
    })),
  };
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const BUFFER_BOX = { width: 168, height: 80 };
const PROJECT_BUFFER_GAP = 80;
const BUFFER_GAP = 24;
const CLEARANCE = 8;

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width + CLEARANCE &&
    b.x < a.x + a.width + CLEARANCE &&
    a.y < b.y + b.height + CLEARANCE &&
    b.y < a.y + a.height + CLEARANCE
  );
}

/** The first candidate spot that doesn't cover a task or another buffer. */
function firstFreeSpot(
  candidates: { x: number; y: number }[],
  taken: Box[],
): { x: number; y: number } {
  const free = candidates.find(
    (spot) => !taken.some((box) => overlaps({ ...spot, ...BUFFER_BOX }, box)),
  );
  // Nowhere is clear: fall back to the preferred spot.
  return free ?? candidates[0] ?? { x: 0, y: 0 };
}

/** Spots just below and just above a task, centred on it. */
function besideTask(task: Box) {
  const x = task.x + (task.width - BUFFER_BOX.width) / 2;
  return [
    { x, y: task.y + task.height + BUFFER_GAP },
    { x, y: task.y - BUFFER_GAP - BUFFER_BOX.height },
  ];
}

export type BufferPlacement =
  | {
      kind: "project";
      id: string;
      x: number;
      y: number;
      sizeDays: number;
      afterTaskId: string;
    }
  | {
      kind: "feeding";
      id: string;
      x: number;
      y: number;
      sizeDays: number;
      startNow: boolean;
      /** Absent when the project has no start date. */
      latestStartDate?: string;
    };

/**
 * Where to draw each buffer without covering tasks. The project buffer goes
 * just after the last chain task; each feeding buffer goes halfway along the
 * link it protects, or beside the feeding chain's last task when that link is
 * too short. Buffers whose tasks aren't on the canvas are skipped.
 */
export function placeBuffers(
  view: Extract<ChainView, { status: "ready" }>,
  boxes: Map<string, Box>,
): BufferPlacement[] {
  const placements: BufferPlacement[] = [];
  const taken = [...boxes.values()];
  const take = (spot: { x: number; y: number }) => {
    taken.push({ ...spot, ...BUFFER_BOX });
    return spot;
  };

  const lastId = view.chain.at(-1);
  const last = lastId === undefined ? undefined : boxes.get(lastId);
  if (lastId !== undefined && last) {
    const spot = take(
      firstFreeSpot(
        [
          {
            x: last.x + last.width + PROJECT_BUFFER_GAP,
            y: last.y + (last.height - BUFFER_BOX.height) / 2,
          },
          ...besideTask(last),
        ],
        taken,
      ),
    );
    placements.push({
      kind: "project",
      id: "project-buffer",
      ...spot,
      sizeDays: view.projectBufferDays,
      afterTaskId: lastId,
    });
  }

  for (const fb of view.feedingBuffers) {
    const end = boxes.get(fb.endTaskId);
    const merge = boxes.get(fb.mergeTaskId);
    if (!end || !merge) {
      continue;
    }
    const centreX = (end.x + end.width + merge.x) / 2;
    const centreY = (end.y + end.height / 2 + merge.y + merge.height / 2) / 2;
    const spot = take(
      firstFreeSpot(
        [
          {
            x: centreX - BUFFER_BOX.width / 2,
            y: centreY - BUFFER_BOX.height / 2,
          },
          ...besideTask(end),
        ],
        taken,
      ),
    );
    placements.push({
      kind: "feeding",
      id: `feeding-buffer:${fb.id}`,
      ...spot,
      sizeDays: fb.sizeDays,
      startNow: fb.startNow,
      ...(view.datesKnown ? { latestStartDate: fb.latestStartDate } : {}),
    });
  }

  return placements;
}
