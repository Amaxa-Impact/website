import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { projectQuery } from "./custom";
import {
  assertUserInProject,
  assertUserIsCoach,
  requireAuth,
} from "./permissions";
import {
  assertIsoDate,
  assertValidCcpmFields,
  taskStatusValidator,
} from "./taskFields";

// Weekly updates: each owner reports on their open tasks; every report also
// goes into the taskUpdates log.

const OPEN_STATUSES = ["in_progress", "waiting", "todo"] as const;
type OpenStatus = (typeof OPEN_STATUSES)[number];

/** The signed-in user's open tasks in a project: in progress, waiting, then to do. */
export const listMine = projectQuery({
  args: { projectId: v.id("projects") },
  returns: v.array(
    v.object({
      id: v.id("tasks"),
      label: v.string(),
      status: taskStatusValidator,
      bestDays: v.optional(v.number()),
      actualStart: v.optional(v.string()),
      daysRemaining: v.optional(v.number()),
      lastUpdateDate: v.optional(v.string()),
    }),
  ),
  role: "member",
  handler: async (ctx) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", ctx.project._id))
      .collect();

    const isOpen = (status: Doc<"tasks">["status"]): status is OpenStatus =>
      OPEN_STATUSES.includes(status as OpenStatus);
    // A task with no status yet counts as to do.
    const mine = tasks.flatMap((task) => {
      const status = task.status ?? "todo";
      return task.assignedTo === ctx.userId && isOpen(status)
        ? [{ task, status }]
        : [];
    });

    const rows = await Promise.all(
      mine.map(async ({ task, status }) => {
        const last = await ctx.db
          .query("taskUpdates")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .order("desc")
          .first();
        return {
          id: task._id,
          label: task.label ?? "Untitled task",
          status,
          ...(task.bestDays === undefined ? {} : { bestDays: task.bestDays }),
          ...(task.actualStart === undefined
            ? {}
            : { actualStart: task.actualStart }),
          ...(task.daysRemaining === undefined
            ? {}
            : { daysRemaining: task.daysRemaining }),
          ...(last ? { lastUpdateDate: last.date } : {}),
        };
      }),
    );

    return rows.sort(
      (a, b) =>
        OPEN_STATUSES.indexOf(a.status) - OPEN_STATUSES.indexOf(b.status) ||
        a.label.localeCompare(b.label),
    );
  },
});

/**
 * Records one weekly update. The owner (or a coach) can report days left,
 * mark the task Done on a date, or set it to Waiting on someone. `today` is
 * the reporter's local date, used for the log and as the start date of a
 * task that hadn't started.
 */
export const submit = mutation({
  args: {
    taskId: v.id("tasks"),
    today: v.string(),
    update: v.union(
      v.object({ kind: v.literal("progress"), daysRemaining: v.number() }),
      v.object({
        kind: v.literal("waiting"),
        daysRemaining: v.optional(v.number()),
      }),
      v.object({ kind: v.literal("done"), finishDate: v.string() }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { taskId, today, update }) => {
    const userId = await requireAuth(ctx);
    const task = await ctx.db.get(taskId);
    if (!task) {
      throw new ConvexError("Task not found");
    }
    if (task.assignedTo === userId) {
      await assertUserInProject(ctx, userId, task.projectId);
    } else {
      await assertUserIsCoach(ctx, userId, task.projectId);
    }

    assertIsoDate(today, "today");
    if (task.status === "completed" || task.status === "blocked") {
      throw new ConvexError("This task is already closed");
    }

    let patch: Partial<Doc<"tasks">>;
    switch (update.kind) {
      case "progress":
        if (
          !(Number.isFinite(update.daysRemaining) && update.daysRemaining > 0)
        ) {
          throw new ConvexError(
            "Days left must be more than 0. Mark the task Done instead.",
          );
        }
        patch = {
          status: "in_progress",
          daysRemaining: update.daysRemaining,
          actualStart: task.actualStart ?? today,
        };
        break;
      case "waiting":
        patch = {
          status: "waiting",
          ...(update.daysRemaining === undefined
            ? {}
            : { daysRemaining: update.daysRemaining }),
        };
        break;
      case "done":
        assertIsoDate(update.finishDate, "finishDate");
        if (update.finishDate > today) {
          throw new ConvexError("The finish date can't be in the future");
        }
        if (
          task.actualStart !== undefined &&
          update.finishDate < task.actualStart
        ) {
          throw new ConvexError(
            `The finish date can't be before the start date (${task.actualStart})`,
          );
        }
        patch = {
          status: "completed",
          actualFinish: update.finishDate,
          daysRemaining: 0,
        };
        break;
    }

    assertValidCcpmFields({ ...task, ...patch });
    await ctx.db.patch(taskId, patch);
    await ctx.db.insert("taskUpdates", {
      taskId,
      projectId: task.projectId,
      userId,
      date: today,
      status: patch.status ?? "in_progress",
      ...(patch.daysRemaining === undefined
        ? {}
        : { daysRemaining: patch.daysRemaining }),
    });
    return null;
  },
});
