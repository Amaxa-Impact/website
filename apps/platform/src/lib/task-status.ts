export type TaskStatus =
  | "todo"
  | "in_progress"
  | "completed"
  | "blocked"
  | "waiting";

export const TASK_STATUSES: TaskStatus[] = [
  "todo",
  "in_progress",
  "completed",
  "blocked",
  "waiting",
];

const v1Labels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  completed: "Completed",
  blocked: "Blocked",
  waiting: "Waiting",
};

// Critical Chain v2 wording. The stored values don't change:
// completed = Done, blocked = Unable to Complete.
const v2Labels: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  waiting: "Waiting on someone",
  completed: "Done",
  blocked: "Unable to Complete",
};

export function statusLabel(status: TaskStatus, ccpmV2 = false): string {
  return (ccpmV2 ? v2Labels : v1Labels)[status];
}

/** Statuses a user can pick. "Waiting" only exists on v2 projects. */
export function statusOptions(
  ccpmV2 = false,
): { value: TaskStatus; label: string }[] {
  const order: TaskStatus[] = ccpmV2
    ? ["todo", "in_progress", "waiting", "completed", "blocked"]
    : ["todo", "in_progress", "completed", "blocked"];
  return order.map((value) => ({ value, label: statusLabel(value, ccpmV2) }));
}
