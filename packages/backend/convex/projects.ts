import { ConvexError, v } from "convex/values";

import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  projectMutation,
  projectQuery,
  workspaceMutation,
  workspaceQuery,
} from "./custom";
import {
  assertUserInProject,
  assertUserIsCoach,
  canManageProject,
  getEffectiveWorkspaceRole,
  getUserRole,
  isSiteAdmin,
  requireAuth,
} from "./permissions";
import { assertIsoDate, bufferMethodValidator } from "./taskFields";

/** Critical Chain v2 settings stored on a project (all optional). */
const projectCcpmFields = {
  ccpmV2: v.optional(v.boolean()),
  startDate: v.optional(v.string()),
  deadline: v.optional(v.string()),
  bufferMethod: v.optional(bufferMethodValidator),
  safeRatio: v.optional(v.number()),
};

/**
 * Create a new project
 */
export const create = workspaceMutation({
  args: {
    workspaceSlug: v.string(),
    name: v.string(),
    description: v.string(),
  },
  returns: v.id("projects"),
  role: "admin",
  handler: async (ctx, args) => {
    const { workspace, userId } = ctx;

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      workspaceId: workspace._id,
    });

    await ctx.db.insert("userToProject", {
      userId,
      projectId,
      workspaceId: workspace._id,
      role: "coach",
    });

    return projectId;
  },
});

/**
 * Create a new project from a template
 */
export const createFromTemplate = workspaceMutation({
  args: {
    workspaceSlug: v.string(),
    templateId: v.id("projectTemplates"),
    name: v.string(),
    description: v.string(),
  },
  returns: v.id("projects"),
  role: "admin",
  handler: async (ctx, args) => {
    const { workspace, userId } = ctx;

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new ConvexError("Template not found");
    }

    if (template.workspaceId === null) {
      const canUsePrivateGlobalTemplate =
        template.isPublic ||
        template.createdBy === userId ||
        (await isSiteAdmin(ctx, userId));

      if (!canUsePrivateGlobalTemplate) {
        throw new ConvexError("You do not have access to this template");
      }
    } else if (template.workspaceId !== workspace._id) {
      throw new ConvexError(
        "Template belongs to a different workspace and cannot be used here",
      );
    }

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      workspaceId: workspace._id,
    });

    await ctx.db.insert("userToProject", {
      userId,
      projectId,
      workspaceId: workspace._id,
      role: "coach",
    });

    const templateTasks = await ctx.db
      .query("templateTasks")
      .withIndex("by_templateId", (q) => q.eq("templateId", template._id))
      .collect();

    const templateTaskToTaskMap: Record<
      Id<"templateTasks">,
      Id<"tasks">
    > = {} as Record<Id<"templateTasks">, Id<"tasks">>;

    for (const templateTask of templateTasks) {
      const taskData: {
        projectId: Id<"projects">;
        label: string;
        status: "todo" | "in_progress" | "completed" | "blocked";
        priority: "low" | "medium" | "high";
        description?: string;
      } = {
        projectId,
        label: templateTask.label,
        status: templateTask.status,
        priority: templateTask.priority,
      };

      if (templateTask.description !== undefined) {
        taskData.description = templateTask.description;
      }

      const taskId = await ctx.db.insert("tasks", {
        ...taskData,
      });

      await ctx.db.insert("taskNodes", {
        taskId,
        projectId,
        type: "task",
        position: templateTask.position,
      });

      templateTaskToTaskMap[templateTask._id] = taskId;
    }

    for (const templateTask of templateTasks) {
      const targetTaskId = templateTaskToTaskMap[templateTask._id];

      if (!targetTaskId) {
        continue;
      }

      for (const dependencyTemplateTaskId of templateTask.dependencies) {
        const sourceTaskId = templateTaskToTaskMap[dependencyTemplateTaskId];

        if (!sourceTaskId) {
          continue;
        }

        await ctx.db.insert("edges", {
          projectId,
          source: sourceTaskId,
          target: targetTaskId,
          type: "smoothstep",
        });
      }
    }

    return projectId;
  },
});

/**
 * Get a project by ID
 */
export const get = projectQuery({
  args: {
    projectId: v.id("projects"),
  },
  role: "member",
  returns: v.union(
    v.object({
      _id: v.id("projects"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.string(),
      workspaceId: v.string(),
      ...projectCcpmFields,
      commitment: v.optional(
        v.object({
          date: v.string(),
          confirmedAt: v.number(),
          confirmedBy: v.string(),
        }),
      ),
    }),
    v.null(),
  ),
  handler: (ctx) => {
    return ctx.project;
  },
});

/**
 * List all projects for the currently authenticated user
 * TODO: workspaceId should be v.id("workspaces") after migration is complete
 */
export const listForUser = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("projects"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.string(),
      role: v.union(v.literal("coach"), v.literal("member")),
      workspaceId: v.id("workspaces"),
    }),
  ),
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const userToProjects = await ctx.db
      .query("userToProject")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Batch load all projects to avoid N+1 queries
    const projectIds = userToProjects.map((utp) => utp.projectId);
    const projects = await Promise.all(projectIds.map((id) => ctx.db.get(id)));

    // Create a map for O(1) lookup
    const projectMap = new Map(
      projects
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((p) => [p._id.toString(), p]),
    );

    return userToProjects
      .map((utp) => {
        const project = projectMap.get(utp.projectId.toString());
        if (!project) return null;

        return {
          _id: project._id,
          _creationTime: project._creationTime,
          name: project.name,
          description: project.description,
          role: utp.role,
          workspaceId: utp.workspaceId,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  },
});

/**
 * List projects for a workspace (requires workspace membership)
 */
export const listByWorkspace = workspaceQuery({
  args: {
    workspaceSlug: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("projects"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.string(),
      workspaceId: v.string(),
      ...projectCcpmFields,
    }),
  ),
  role: "member",
  handler: async (ctx) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", ctx.workspaceId))
      .collect();
  },
});

/**
 * Update a project (name and description)
 * Requires coach permissions
 */
export const update = projectMutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  role: "coach",
  handler: async (ctx, args) => {
    const { projectId, ...updates } = args;
    await ctx.db.patch(projectId, updates);
    return null;
  },
});

/**
 * Whether the current user may change Critical Chain settings for a project:
 * a project coach, a workspace admin/owner, or a site admin.
 */
export const canManage = query({
  args: { projectId: v.id("projects") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      return false;
    }
    return await canManageProject(ctx, identity.subject, args.projectId);
  },
});

/**
 * Update Critical Chain settings, including the per-project ccpmV2 switch.
 * Coaches, workspace admins/owners and site admins may call this.
 */
export const updateCcpmSettings = mutation({
  args: {
    projectId: v.id("projects"),
    ...projectCcpmFields,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (!(await canManageProject(ctx, userId, args.projectId))) {
      throw new ConvexError(
        "Only coaches, workspace admins and site admins can change these settings",
      );
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new ConvexError("Project not found");
    }

    const { projectId, ...changes } = args;
    const updates = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    ) as Partial<typeof changes>;

    const merged = { ...project, ...updates };
    assertIsoDate(merged.startDate, "startDate");
    assertIsoDate(merged.deadline, "deadline");
    if (
      merged.startDate !== undefined &&
      merged.deadline !== undefined &&
      merged.deadline < merged.startDate
    ) {
      throw new ConvexError("deadline cannot be before startDate");
    }
    if (
      merged.safeRatio !== undefined &&
      !(Number.isFinite(merged.safeRatio) && merged.safeRatio >= 1)
    ) {
      throw new ConvexError("safeRatio must be 1 or more");
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(projectId, updates);
    }
    return null;
  },
});

/**
 * Records the finish date the team commits to (start + critical chain +
 * project buffer, worked out on the client). Same permissions as the
 * Critical Chain settings; confirming again replaces the old date.
 */
export const confirmCommitment = mutation({
  args: { projectId: v.id("projects"), date: v.string() },
  returns: v.null(),
  handler: async (ctx, { projectId, date }) => {
    const userId = await requireAuth(ctx);
    if (!(await canManageProject(ctx, userId, projectId))) {
      throw new ConvexError(
        "Only coaches, workspace admins and site admins can confirm the commitment",
      );
    }
    const project = await ctx.db.get(projectId);
    if (!project) {
      throw new ConvexError("Project not found");
    }
    assertIsoDate(date, "date");
    if (project.startDate !== undefined && date < project.startDate) {
      throw new ConvexError("The commitment can't be before the start date");
    }
    await ctx.db.patch(projectId, {
      commitment: { date, confirmedAt: Date.now(), confirmedBy: userId },
    });
    return null;
  },
});

/**
 * Get user's role in a project. Site admins get "coach" role.
 */
export const getUserProjectRole = query({
  args: {
    projectId: v.id("projects"),
  },
  returns: v.union(v.literal("coach"), v.literal("member"), v.null()),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    if (await isSiteAdmin(ctx, userId)) {
      return "coach";
    }

    const role = await getUserRole(ctx, userId, args.projectId);
    return role;
  },
});

/**
 * Delete a project and all associated data
 */
export const remove = workspaceMutation({
  args: {
    projectId: v.id("projects"),
  },
  role: "admin",
  returns: v.null(),
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    const edges = await ctx.db
      .query("edges")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const edge of edges) {
      await ctx.db.delete(edge._id);
    }

    const userAssignments = await ctx.db
      .query("userToProject")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const assignment of userAssignments) {
      await ctx.db.delete(assignment._id);
    }

    const workstreams = await ctx.db
      .query("workstreams")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const workstream of workstreams) {
      await ctx.db.delete(workstream._id);
    }

    const updates = await ctx.db
      .query("taskUpdates")
      .withIndex("by_project_and_date", (q) =>
        q.eq("projectId", args.projectId),
      )
      .collect();
    for (const update of updates) {
      await ctx.db.delete(update._id);
    }

    const snapshots = await ctx.db
      .query("weeklySnapshots")
      .withIndex("by_project_and_date", (q) =>
        q.eq("projectId", args.projectId),
      )
      .collect();
    for (const snapshot of snapshots) {
      await ctx.db.delete(snapshot._id);
    }

    await ctx.db.delete(args.projectId);
    return null;
  },
});

export const checkProjectAccess = query({
  args: {
    projectId: v.id("projects"),
    userId: v.string(),
    role: v.union(v.literal("member"), v.literal("coach")),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.auth.getUserIdentity();

    if (!session?.accessToken) {
      throw new ConvexError("Unauthorized");
    }

    const project = await ctx.db.get(args.projectId);

    if (!project) {
      throw new ConvexError("Project not found");
    }

    const workspaceId = project.workspaceId;

    const workspaceRole = await getEffectiveWorkspaceRole(
      ctx,
      args.userId,
      workspaceId as Id<"workspaces">,
    );

    if (workspaceRole === "admin" || workspaceRole === "owner") {
      return true;
    }

    if (args.role === "member") {
      await assertUserInProject(ctx, args.userId, project._id);
    } else {
      await assertUserIsCoach(ctx, args.userId, project._id);
    }

    return true;
  },
});
