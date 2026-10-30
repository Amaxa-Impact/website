import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  assertUserInProject,
  canManageProject,
  requireAuth,
} from "./permissions";

const workstreamValidator = v.object({
  _id: v.id("workstreams"),
  _creationTime: v.number(),
  projectId: v.id("projects"),
  name: v.string(),
  colour: v.string(),
});

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

function cleanFields(name: string, colour: string) {
  const trimmed = name.trim();
  if (trimmed === "") {
    throw new ConvexError("Workstream name is required");
  }
  if (!HEX_COLOUR.test(colour)) {
    throw new ConvexError("colour must be a hex value like #8b72be");
  }
  return { name: trimmed, colour };
}

export const listForProject = query({
  args: { projectId: v.id("projects") },
  returns: v.array(workstreamValidator),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await assertUserInProject(ctx, userId, args.projectId);

    return await ctx.db
      .query("workstreams")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    colour: v.string(),
  },
  returns: v.id("workstreams"),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (!(await canManageProject(ctx, userId, args.projectId))) {
      throw new ConvexError("Only coaches and admins can manage workstreams");
    }

    return await ctx.db.insert("workstreams", {
      projectId: args.projectId,
      ...cleanFields(args.name, args.colour),
    });
  },
});

export const update = mutation({
  args: {
    workstreamId: v.id("workstreams"),
    name: v.string(),
    colour: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const workstream = await ctx.db.get(args.workstreamId);
    if (!workstream) {
      throw new ConvexError("Workstream not found");
    }
    if (!(await canManageProject(ctx, userId, workstream.projectId))) {
      throw new ConvexError("Only coaches and admins can manage workstreams");
    }

    await ctx.db.patch(args.workstreamId, cleanFields(args.name, args.colour));
    return null;
  },
});

/** Removes the workstream and un-assigns its tasks; the tasks themselves stay. */
export const remove = mutation({
  args: { workstreamId: v.id("workstreams") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const workstream = await ctx.db.get(args.workstreamId);
    if (!workstream) {
      throw new ConvexError("Workstream not found");
    }
    if (!(await canManageProject(ctx, userId, workstream.projectId))) {
      throw new ConvexError("Only coaches and admins can manage workstreams");
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", workstream.projectId))
      .collect();
    for (const task of tasks) {
      if (task.workstreamId === args.workstreamId) {
        await ctx.db.patch(task._id, { workstreamId: undefined });
      }
    }

    await ctx.db.delete(args.workstreamId);
    return null;
  },
});
