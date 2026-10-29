import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";

import type { Id } from "../_generated/dataModel";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "./test.setup";

// permissions.ts treats every non-production environment as an e2e run (all
// users are site admins), which would make the permission checks below
// vacuous. Must be set before the modules are first loaded.
vi.stubEnv("NODE_ENV", "production");

async function setup() {
  const t = convexTest(schema, modules);

  const ids = await t.run(async (ctx) => {
    const workspaceId = await ctx.db.insert("workspaces", {
      name: "Cohort",
      slug: "cohort",
      createdBy: "ws_admin",
      createdAt: Date.now(),
    });
    await ctx.db.insert("workspaceToUser", {
      workspaceId,
      userId: "ws_admin",
      role: "admin",
    });
    await ctx.db.insert("siteUser", { userId: "site_admin", role: "admin" });

    const projectId = await ctx.db.insert("projects", {
      name: "Fundraiser",
      description: "GoFundMe",
      workspaceId,
    });
    const otherProjectId = await ctx.db.insert("projects", {
      name: "Other",
      description: "Other project",
      workspaceId,
    });
    for (const [userId, role] of [
      ["coach_user", "coach"],
      ["member_user", "member"],
    ] as const) {
      await ctx.db.insert("userToProject", {
        workspaceId,
        userId,
        projectId,
        role,
      });
    }

    return { workspaceId, projectId, otherProjectId };
  });

  return {
    t,
    ...ids,
    asCoach: t.withIdentity({ subject: "coach_user" }),
    asMember: t.withIdentity({ subject: "member_user" }),
    asWsAdmin: t.withIdentity({ subject: "ws_admin" }),
    asSiteAdmin: t.withIdentity({ subject: "site_admin" }),
    asOutsider: t.withIdentity({ subject: "outsider" }),
  };
}

describe("task CCPM fields", () => {
  it("stores and returns estimates, dates and external-wait fields", async () => {
    const { projectId, asMember } = await setup();

    const taskId = await asMember.mutation(api.tasks.create, {
      projectId,
      type: "task",
      position: { x: 0, y: 0 },
      data: {
        label: "Confirm story",
        assignedTo: "member_user",
        bestDays: 5,
        safeDays: 10,
        isExternal: true,
        externalContact: "Partner",
        followUpDate: "2026-11-02",
      },
    });

    await asMember.mutation(api.tasks.updateData, {
      taskId,
      data: {
        status: "in_progress",
        actualStart: "2026-10-26",
        daysRemaining: 3,
      },
    });

    const nodes = await asMember.query(api.tasks.listForProject, { projectId });
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.data).toMatchObject({
      label: "Confirm story",
      status: "in_progress",
      bestDays: 5,
      safeDays: 10,
      isExternal: true,
      externalContact: "Partner",
      followUpDate: "2026-11-02",
      actualStart: "2026-10-26",
      daysRemaining: 3,
    });
  });

  it("still lists tasks that have none of the new fields", async () => {
    const { t, projectId, asMember } = await setup();

    await t.run(async (ctx) => {
      const taskId = await ctx.db.insert("tasks", {
        projectId,
        label: "Old task",
        status: "blocked",
        priority: "high",
      });
      await ctx.db.insert("taskNodes", {
        taskId,
        projectId,
        type: "task",
        position: { x: 1, y: 2 },
      });
    });

    const nodes = await asMember.query(api.tasks.listForProject, { projectId });
    expect(nodes[0]?.data.label).toBe("Old task");
    expect(nodes[0]?.data.status).toBe("blocked");
    expect(nodes[0]?.data.bestDays).toBeUndefined();
  });

  it("accepts the waiting status and counts it on the dashboard", async () => {
    const { projectId, asMember } = await setup();

    const taskId = await asMember.mutation(api.tasks.create, {
      projectId,
      type: "task",
      position: { x: 0, y: 0 },
      data: { label: "Book speaker", assignedTo: "member_user" },
    });
    await asMember.mutation(api.tasks.updateData, {
      taskId,
      data: { status: "waiting" },
    });

    const counts = await asMember.query(api.dashboard.getTaskStatusCounts, {
      projectId,
    });
    expect(counts.allTasks.waiting).toBe(1);
    expect(counts.userTasks.waiting).toBe(1);
    expect(counts.allTasks.todo).toBe(0);
    expect(counts.totalAll).toBe(1);
  });

  it("clears optional fields only when asked to", async () => {
    const { projectId, asMember } = await setup();
    const taskId = await asMember.mutation(api.tasks.create, {
      projectId,
      type: "task",
      position: { x: 0, y: 0 },
      data: { label: "T", bestDays: 4, safeDays: 7, daysRemaining: 2 },
    });

    // Leaving a field out changes nothing.
    await asMember.mutation(api.tasks.updateData, {
      taskId,
      data: { label: "Renamed" },
    });
    let node = (
      await asMember.query(api.tasks.listForProject, { projectId })
    )[0];
    expect(node.data).toMatchObject({ bestDays: 4, safeDays: 7 });

    await asMember.mutation(api.tasks.updateData, {
      taskId,
      data: {},
      clear: ["safeDays", "daysRemaining"],
    });
    node = (await asMember.query(api.tasks.listForProject, { projectId }))[0];
    expect(node.data.bestDays).toBe(4);
    expect(node.data.safeDays).toBeUndefined();
    expect(node.data.daysRemaining).toBeUndefined();
    expect(node.data.label).toBe("Renamed");
  });

  it("refuses to set and clear the same field", async () => {
    const { projectId, asMember } = await setup();
    const taskId = await asMember.mutation(api.tasks.create, {
      projectId,
      type: "task",
      position: { x: 0, y: 0 },
      data: { label: "T", bestDays: 4 },
    });
    await expect(
      asMember.mutation(api.tasks.updateData, {
        taskId,
        data: { bestDays: 5 },
        clear: ["bestDays"],
      }),
    ).rejects.toThrow(/set and clear/);
  });

  it("validates the result after clearing (safe still >= best)", async () => {
    const { projectId, asMember } = await setup();
    const taskId = await asMember.mutation(api.tasks.create, {
      projectId,
      type: "task",
      position: { x: 0, y: 0 },
      data: { label: "T", bestDays: 4, safeDays: 7 },
    });
    // Clearing best while raising nothing else is fine (safe-only is allowed).
    await asMember.mutation(api.tasks.updateData, {
      taskId,
      data: {},
      clear: ["bestDays"],
    });
    await expect(
      asMember.mutation(api.tasks.updateData, {
        taskId,
        data: { bestDays: 9 },
      }),
    ).rejects.toThrow(/greater than or equal to bestDays/);
  });

  describe("validation", () => {
    async function oneTask() {
      const ctx = await setup();
      const taskId = await ctx.asMember.mutation(api.tasks.create, {
        projectId: ctx.projectId,
        type: "task",
        position: { x: 0, y: 0 },
        data: { label: "T", bestDays: 4, safeDays: 7 },
      });
      return { ...ctx, taskId };
    }

    it("rejects non-positive estimates", async () => {
      const { asMember, taskId } = await oneTask();
      await expect(
        asMember.mutation(api.tasks.updateData, {
          taskId,
          data: { bestDays: 0 },
        }),
      ).rejects.toThrow(/greater than 0/);
    });

    it("checks safe >= best against the stored value on partial updates", async () => {
      const { asMember, taskId } = await oneTask();
      await expect(
        asMember.mutation(api.tasks.updateData, {
          taskId,
          data: { safeDays: 3 },
        }),
      ).rejects.toThrow(/greater than or equal to bestDays/);
      await expect(
        asMember.mutation(api.tasks.updateData, {
          taskId,
          data: { bestDays: 9 },
        }),
      ).rejects.toThrow(/greater than or equal to bestDays/);
    });

    it("rejects malformed or impossible dates and finish before start", async () => {
      const { asMember, taskId } = await oneTask();
      await expect(
        asMember.mutation(api.tasks.updateData, {
          taskId,
          data: { actualStart: "26/10/2026" },
        }),
      ).rejects.toThrow(/YYYY-MM-DD/);
      await expect(
        asMember.mutation(api.tasks.updateData, {
          taskId,
          data: { followUpDate: "2026-02-31" },
        }),
      ).rejects.toThrow(/YYYY-MM-DD/);

      await asMember.mutation(api.tasks.updateData, {
        taskId,
        data: { actualStart: "2026-10-26" },
      });
      await expect(
        asMember.mutation(api.tasks.updateData, {
          taskId,
          data: { actualFinish: "2026-10-20" },
        }),
      ).rejects.toThrow(/before actualStart/);
    });

    it("rejects a workstream from another project", async () => {
      const { t, otherProjectId, asMember, taskId } = await oneTask();
      const foreign = await t.run((ctx) =>
        ctx.db.insert("workstreams", {
          projectId: otherProjectId,
          name: "Elsewhere",
          colour: "#112233",
        }),
      );
      await expect(
        asMember.mutation(api.tasks.updateData, {
          taskId,
          data: { workstreamId: foreign },
        }),
      ).rejects.toThrow(/does not belong/);
    });
  });
});

describe("project CCPM settings", () => {
  const settings = {
    ccpmV2: true,
    startDate: "2026-10-26",
    deadline: "2026-12-21",
    bufferMethod: "rss" as const,
    safeRatio: 1.5,
  };

  it("lets coaches, workspace admins and site admins update them", async () => {
    const { projectId, asCoach, asWsAdmin, asSiteAdmin } = await setup();

    await asCoach.mutation(api.projects.updateCcpmSettings, {
      projectId,
      ...settings,
    });
    await asWsAdmin.mutation(api.projects.updateCcpmSettings, {
      projectId,
      bufferMethod: "half",
    });
    await asSiteAdmin.mutation(api.projects.updateCcpmSettings, {
      projectId,
      ccpmV2: false,
    });

    const project = await asCoach.query(api.projects.get, { projectId });
    expect(project).toMatchObject({
      ccpmV2: false,
      startDate: "2026-10-26",
      deadline: "2026-12-21",
      bufferMethod: "half",
      safeRatio: 1.5,
    });
  });

  it("denies students and non-members", async () => {
    const { projectId, asMember, asOutsider } = await setup();

    for (const caller of [asMember, asOutsider]) {
      await expect(
        caller.mutation(api.projects.updateCcpmSettings, {
          projectId,
          ccpmV2: true,
        }),
      ).rejects.toThrow(/Only coaches/);
    }
  });

  it("reports who can manage via canManage", async () => {
    const { projectId, asCoach, asMember, asWsAdmin, asSiteAdmin, asOutsider } =
      await setup();
    const answers = await Promise.all(
      [asCoach, asWsAdmin, asSiteAdmin, asMember, asOutsider].map((caller) =>
        caller.query(api.projects.canManage, { projectId }),
      ),
    );
    expect(answers).toEqual([true, true, true, false, false]);
  });

  it("validates dates and the safe ratio", async () => {
    const { projectId, asCoach } = await setup();

    await expect(
      asCoach.mutation(api.projects.updateCcpmSettings, {
        projectId,
        startDate: "2026-10-26",
        deadline: "2026-10-01",
      }),
    ).rejects.toThrow(/before startDate/);
    await expect(
      asCoach.mutation(api.projects.updateCcpmSettings, {
        projectId,
        deadline: "soon",
      }),
    ).rejects.toThrow(/YYYY-MM-DD/);
    await expect(
      asCoach.mutation(api.projects.updateCcpmSettings, {
        projectId,
        safeRatio: 0.5,
      }),
    ).rejects.toThrow(/1 or more/);
  });

  it("returns the settings from listByWorkspace and leaves untouched projects valid", async () => {
    const { projectId, otherProjectId, asCoach, asWsAdmin } = await setup();
    await asCoach.mutation(api.projects.updateCcpmSettings, {
      projectId,
      ...settings,
    });

    const projects = await asWsAdmin.query(api.projects.listByWorkspace, {
      workspaceSlug: "cohort",
    });
    const byId = new Map(projects.map((p) => [p._id, p]));
    expect(byId.get(projectId)?.ccpmV2).toBe(true);
    expect(byId.get(otherProjectId)?.ccpmV2).toBeUndefined();
  });

  it("refuses replaceProjectGraph on a v2 project", async () => {
    const { projectId, asCoach } = await setup();
    await asCoach.mutation(api.projects.updateCcpmSettings, {
      projectId,
      ccpmV2: true,
    });
    await expect(
      asCoach.mutation(api.graph.replaceProjectGraph, {
        projectId,
        nodes: [],
        edges: [],
      }),
    ).rejects.toThrow(/not supported/);
  });
});

describe("workstreams", () => {
  it("lets coaches manage them and everyone on the project read them", async () => {
    const { projectId, asCoach, asMember } = await setup();

    const id = await asCoach.mutation(api.workstreams.create, {
      projectId,
      name: "  Campaign  ",
      colour: "#8b72be",
    });
    await asCoach.mutation(api.workstreams.update, {
      workstreamId: id,
      name: "Social",
      colour: "#112233",
    });

    const seen = await asMember.query(api.workstreams.listForProject, {
      projectId,
    });
    expect(seen).toMatchObject([{ name: "Social", colour: "#112233" }]);

    await expect(
      asMember.mutation(api.workstreams.create, {
        projectId,
        name: "Nope",
        colour: "#000000",
      }),
    ).rejects.toThrow(/Only coaches/);
  });

  it("rejects blank names and bad colours", async () => {
    const { projectId, asCoach } = await setup();
    await expect(
      asCoach.mutation(api.workstreams.create, {
        projectId,
        name: "   ",
        colour: "#000000",
      }),
    ).rejects.toThrow(/name is required/);
    await expect(
      asCoach.mutation(api.workstreams.create, {
        projectId,
        name: "X",
        colour: "red",
      }),
    ).rejects.toThrow(/hex/);
  });

  it("un-assigns tasks on remove without deleting them", async () => {
    const { projectId, asCoach, asMember } = await setup();
    const workstreamId = await asCoach.mutation(api.workstreams.create, {
      projectId,
      name: "Event",
      colour: "#abcdef",
    });
    const taskId = await asMember.mutation(api.tasks.create, {
      projectId,
      type: "task",
      position: { x: 0, y: 0 },
      data: { label: "Host event", workstreamId },
    });

    await asCoach.mutation(api.workstreams.remove, { workstreamId });

    const nodes = await asMember.query(api.tasks.listForProject, { projectId });
    expect(nodes.map((n) => n.id)).toEqual([taskId]);
    expect(nodes[0]?.data.workstreamId).toBeUndefined();
  });
});

describe("deleting a project", () => {
  it("removes workstreams, task updates and snapshots with it", async () => {
    const { t, projectId, asWsAdmin, asMember } = await setup();

    const taskId = await asMember.mutation(api.tasks.create, {
      projectId,
      type: "task",
      position: { x: 0, y: 0 },
      data: { label: "T" },
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("workstreams", {
        projectId,
        name: "W",
        colour: "#000000",
      });
      await ctx.db.insert("taskUpdates", {
        taskId,
        projectId,
        userId: "member_user",
        date: "2026-10-26",
        daysRemaining: 2,
        status: "in_progress",
      });
      await ctx.db.insert("weeklySnapshots", {
        projectId,
        date: "2026-10-26",
        chainCompletePct: 10,
        bufferUsedPct: 0,
        bufferUsedDays: 0,
        zone: "green",
        finishEarliest: "2026-12-01",
        finishLatest: "2026-12-10",
      });
    });

    await asWsAdmin.mutation(api.projects.remove, {
      workspaceSlug: "cohort",
      projectId: projectId as Id<"projects">,
    });

    const leftovers = await t.run(async (ctx) => ({
      workstreams: await ctx.db.query("workstreams").collect(),
      updates: await ctx.db.query("taskUpdates").collect(),
      snapshots: await ctx.db.query("weeklySnapshots").collect(),
    }));
    expect(leftovers).toEqual({ workstreams: [], updates: [], snapshots: [] });
  });
});

describe("commitment", () => {
  it("lets a coach confirm the finish date, and replaces it on reconfirm", async () => {
    const { projectId, asCoach } = await setup();
    await asCoach.mutation(api.projects.updateCcpmSettings, {
      projectId,
      startDate: "2026-01-05",
    });

    await asCoach.mutation(api.projects.confirmCommitment, {
      projectId,
      date: "2026-02-22",
    });
    let project = await asCoach.query(api.projects.get, { projectId });
    expect(project.commitment).toMatchObject({
      date: "2026-02-22",
      confirmedBy: "coach_user",
    });

    await asCoach.mutation(api.projects.confirmCommitment, {
      projectId,
      date: "2026-02-25",
    });
    project = await asCoach.query(api.projects.get, { projectId });
    expect(project.commitment?.date).toBe("2026-02-25");
  });

  it("lets workspace admins confirm, but not members", async () => {
    const { projectId, asMember, asWsAdmin } = await setup();
    await expect(
      asMember.mutation(api.projects.confirmCommitment, {
        projectId,
        date: "2026-02-22",
      }),
    ).rejects.toThrow(/Only coaches/);
    await asWsAdmin.mutation(api.projects.confirmCommitment, {
      projectId,
      date: "2026-02-22",
    });
  });

  it("rejects bad dates", async () => {
    const { projectId, asCoach } = await setup();
    await asCoach.mutation(api.projects.updateCcpmSettings, {
      projectId,
      startDate: "2026-01-05",
    });
    await expect(
      asCoach.mutation(api.projects.confirmCommitment, {
        projectId,
        date: "22/02/2026",
      }),
    ).rejects.toThrow();
    await expect(
      asCoach.mutation(api.projects.confirmCommitment, {
        projectId,
        date: "2026-01-01",
      }),
    ).rejects.toThrow(/before the start date/);
  });
});
