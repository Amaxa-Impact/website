import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { projectMutation, projectQuery } from "./custom";
import { assertUserInProject, requireAuth } from "./permissions";
import {
  assertValidCcpmFields,
  assertWorkstreamInProject,
  definedFields,
  taskDataValidator,
} from "./taskFields";

export const create = projectMutation({
  args: {
    projectId: v.id("projects"),
    type: v.string(),
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
    data: taskDataValidator,
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  returns: v.id("tasks"),
  role: "member",
  handler: async (ctx, args) => {
    const type = args.type.trim() === "" ? "task" : args.type;
    const { label, ...rest } = args.data;

    assertValidCcpmFields(rest);
    await assertWorkstreamInProject(ctx, rest.workstreamId, ctx.projectId);

    const taskId = await ctx.db.insert("tasks", {
      projectId: ctx.projectId,
      label: label ?? "New Task",
      ...definedFields(rest),
    });

    await ctx.db.insert("taskNodes", {
      taskId,
      projectId: ctx.projectId,
      type,
      position: args.position,
      width: args.width,
      height: args.height,
    });

    return taskId;
  },
});

/** Returns React Flow nodes format */
export const listForProject = projectQuery({
  args: {
    projectId: v.id("projects"),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      type: v.string(),
      position: v.object({
        x: v.number(),
        y: v.number(),
      }),
      data: taskDataValidator,
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      style: v.optional(
        v.object({
          backgroundColor: v.optional(v.string()),
          borderColor: v.optional(v.string()),
          color: v.optional(v.string()),
        }),
      ),
    }),
  ),
  role: "member",
  handler: async (ctx) => {
    const taskNodes = await ctx.db
      .query("taskNodes")
      .withIndex("by_project", (q) => q.eq("projectId", ctx.project._id))
      .collect();

    const results = await Promise.all(
      taskNodes.map(async (node) => {
        const task = await ctx.db.get(node.taskId);
        if (!task) {
          return null;
        }

        return {
          id: task._id,
          type: node.type,
          position: node.position,
          data: {
            label: task.label,
            description: task.description,
            status: task.status,
            assignedTo: task.assignedTo,
            dueDate: task.dueDate,
            priority: task.priority,
            bestDays: task.bestDays,
            safeDays: task.safeDays,
            workstreamId: task.workstreamId,
            actualStart: task.actualStart,
            actualFinish: task.actualFinish,
            daysRemaining: task.daysRemaining,
            isExternal: task.isExternal,
            externalContact: task.externalContact,
            followUpDate: task.followUpDate,
          },
          width: node.width,
          height: node.height,
          style: node.style,
        };
      }),
    );

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

export const get = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return null;
    }

    await assertUserInProject(ctx, userId, task.projectId);

    const node = await ctx.db
      .query("taskNodes")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .unique();

    return {
      ...task,
      node,
    };
  },
});

export const updatePosition = mutation({
  args: {
    taskId: v.id("tasks"),
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }
    await assertUserInProject(ctx, userId, task.projectId);

    const node = await ctx.db
      .query("taskNodes")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .unique();

    if (node) {
      await ctx.db.patch(node._id, {
        position: args.position,
      });
    }
    return null;
  },
});

export const updateData = mutation({
  args: {
    taskId: v.id("tasks"),
    data: taskDataValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }
    await assertUserInProject(ctx, userId, task.projectId);

    const updates = definedFields(args.data);

    assertValidCcpmFields({ ...task, ...updates });
    await assertWorkstreamInProject(ctx, updates.workstreamId, task.projectId);

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.taskId, updates);
    }
    return null;
  },
});

export const updateStyle = mutation({
  args: {
    taskId: v.id("tasks"),
    style: v.object({
      backgroundColor: v.optional(v.string()),
      borderColor: v.optional(v.string()),
      color: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }
    await assertUserInProject(ctx, userId, task.projectId);

    const node = await ctx.db
      .query("taskNodes")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .unique();

    if (node) {
      await ctx.db.patch(node._id, {
        style: args.style,
      });
    }
    return null;
  },
});

export const remove = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }
    await assertUserInProject(ctx, userId, task.projectId);

    const outgoingEdges = await ctx.db
      .query("edges")
      .withIndex("by_source", (q) => q.eq("source", args.taskId))
      .collect();

    const incomingEdges = await ctx.db
      .query("edges")
      .withIndex("by_target", (q) => q.eq("target", args.taskId))
      .collect();

    for (const edge of [...outgoingEdges, ...incomingEdges]) {
      await ctx.db.delete(edge._id);
    }

    const node = await ctx.db
      .query("taskNodes")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .unique();

    if (node) {
      await ctx.db.delete(node._id);
    }

    await ctx.db.delete(args.taskId);
    return null;
  },
});

export const batchUpdatePositions = mutation({
  args: {
    updates: v.array(
      v.object({
        taskId: v.id("tasks"),
        position: v.object({
          x: v.number(),
          y: v.number(),
        }),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    for (const update of args.updates) {
      const task = await ctx.db.get(update.taskId);
      if (!task) {
        throw new Error(`Task ${update.taskId} not found`);
      }
      await assertUserInProject(ctx, userId, task.projectId);
    }

    for (const update of args.updates) {
      const node = await ctx.db
        .query("taskNodes")
        .withIndex("by_task", (q) => q.eq("taskId", update.taskId))
        .unique();

      if (node) {
        await ctx.db.patch(node._id, {
          position: update.position,
        });
      }
    }
    return null;
  },
});
