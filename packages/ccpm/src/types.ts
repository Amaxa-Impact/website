/** Stored task statuses. completed = Done, blocked = Unable to Complete. */
export type TaskStatus =
  | "todo"
  | "in_progress"
  | "waiting"
  | "completed"
  | "blocked";

export type BufferMethod = "half" | "rss";

export type Zone = "green" | "yellow" | "red";

export interface EngineTask {
  id: string;
  title?: string;
  ownerId?: string;
  /** Best-case days (about a 50/50 estimate). Required. */
  bestDays?: number;
  /** Near-certain days. Defaults to bestDays x the project's safe ratio. */
  safeDays?: number;
  status: TaskStatus;
  /** ISO dates (YYYY-MM-DD). */
  actualStart?: string;
  actualFinish?: string;
  daysRemaining?: number;
}

/** `from` must finish before `to` starts. */
export interface EngineLink {
  from: string;
  to: string;
}

export interface EngineProject {
  startDate: string;
  deadline?: string;
  bufferMethod?: BufferMethod;
  safeRatio?: number;
}

export interface AnalyzeInput {
  project: EngineProject;
  tasks: EngineTask[];
  links: EngineLink[];
  /** The "as of" date, YYYY-MM-DD. */
  today: string;
}

export type EngineError =
  | { kind: "cycle"; taskIds: string[]; message: string }
  | { kind: "unknown_task"; taskIds: string[]; message: string }
  | { kind: "missing_estimates"; taskIds: string[]; message: string }
  | { kind: "invalid_date"; taskIds: string[]; message: string };

export interface PlannedTask {
  id: string;
  /** Day numbers count from the project start (day 0). */
  start: number;
  finish: number;
  startDate: string;
  finishDate: string;
  onChain: boolean;
}

export interface FeedingBuffer {
  id: string;
  /** The chain task this feeding chain joins. */
  mergeTaskId: string;
  /** Last task of the feeding chain (the chain task's predecessor). */
  endTaskId: string;
  /** Feeding chain tasks in order. */
  taskIds: string[];
  lengthDays: number;
  sizeDays: number;
  /** Latest day the feeding chain can start without eating its buffer. */
  latestStart: number;
  latestStartDate: string;
  /** True when the latest start is already before the earliest possible one. */
  startNow: boolean;
  /** Day the feeding chain is planned to finish. */
  plannedFinish: number;
}

export interface OwnerConflict {
  ownerId: string;
  taskIds: [string, string];
}

export interface ExcludedTask {
  taskId: string;
  reason: "unable_to_complete";
}

export interface Warning {
  code:
    | "missing_actual_finish"
    | "missing_actual_start"
    | "missing_days_remaining";
  taskId: string;
  message: string;
}

export interface Plan {
  startDate: string;
  tasks: Record<string, PlannedTask>;
  /** Critical chain task ids in order. */
  chain: string[];
  chainDays: number;
  projectBufferDays: number;
  feedingBuffers: FeedingBuffer[];
  commitment: {
    day: number;
    date: string;
    afterDeadline: boolean;
    daysOverDeadline: number;
  };
  ownerConflicts: OwnerConflict[];
  excluded: ExcludedTask[];
}

export interface ProjectedTask {
  id: string;
  start: number;
  finish: number;
  /** Days of work left as of today (0 when done). */
  remaining: number;
}

export interface FeedingBufferUse {
  id: string;
  usedDays: number;
  usedPct: number;
}

export interface Projection {
  today: number;
  tasks: Record<string, ProjectedTask>;
  chainProjectedFinish: number;
  /** Negative when ahead of the plan. */
  bufferUsedDays: number;
  /** 0 or more; ahead of schedule plots as 0. */
  bufferUsedPct: number;
  feedingBufferUse: FeedingBufferUse[];
  chainCompletePct: number;
  zone: Zone;
  finish: {
    earliestDay: number;
    latestDay: number;
    earliest: string;
    latest: string;
    /** Days after the deadline (negative = before). Absent without a deadline. */
    earliestVsDeadline?: number;
    latestVsDeadline?: number;
  };
}

export interface RankedTask {
  taskId: string;
  onChain: boolean;
  feedingBufferUsedPct: number;
  projectedStart: number;
  /** All predecessors are done, so the work can start now. */
  ready: boolean;
}

export interface OwnerPriority {
  ownerId: string;
  taskId: string | null;
  ready: boolean;
  reason: string;
}

export interface PriorityResult {
  ranked: RankedTask[];
  byOwner: OwnerPriority[];
}

export type AnalyzeResult =
  | {
      ok: true;
      plan: Plan;
      projection: Projection;
      priority: PriorityResult;
      warnings: Warning[];
    }
  | { ok: false; error: EngineError };
