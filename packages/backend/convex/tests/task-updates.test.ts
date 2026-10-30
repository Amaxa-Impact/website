import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";

import type { Id } from "../_generated/dataModel";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "./test.setup";

// See ccpm-model.test.ts: without this every user is a site admin.
vi.stubEnv("NODE_ENV", "production");

async function setup() {
  const t = convexTest(schema, modules);

  const { projectId } = await t.run(async (ctx) => {
    const workspaceId = await ctx.db.insert("workspaces", {
      name: "Cohort",
      slug: "cohort",
      createdBy: "ws_admin",
      createdAt: Date.now(),
    });
    const projectId = await ctx.db.insert("projects", {
      name: "Fundraiser",
      description: "GoFundMe",
      workspaceId,
      ccpmV2: true,
    });
    for (const [userId, role] of [
      ["coach_user", "coach"],
      ["maya", "member"],
      ["tomas", "member"],
    ] as const) {
      await ctx.db.insert("userToProject", {
        workspaceId,
        userId,
        projectId,
        role,
      });
    }
    return { projectId };
  });

  const addTask = (data: Record<string, unknown>) =>
    t.run((ctx) =>
      ctx.db.insert("tasks", { projectId, label: "Task", ...data }),
    );
  const getTask = (taskId: Id<"tasks">) => t.run((ctx) => ctx.db.get(taskId));
  const log = (taskId: Id<"tasks">) =>
    t.run((ctx) =>
      ctx.db
        .query("taskUpdates")
        .withIndex("by_task", (q) => q.eq("taskId", taskId))
        .collect(),
    );

  return {
    t,
    projectId,
    addTask,
    getTask,
    log,
    asMaya: t.withIdentity({ subject: "maya" }),
    asTomas: t.withIdentity({ subject: "tomas" }),
    asCoach: t.withIdentity({ subject: "coach_user" }),
  };
}

describe("taskUpdates.listMine", () => {
  it("lists only my open tasks: in progress, waiting, then to do", async () => {
    const { projectId, addTask, asMaya } = await setup();
    await addTask({ label: "Later", assignedTo: "maya", status: "todo" });
    await addTask({
      label: "Doing",
      assignedTo: "maya",
      status: "in_progress",
    });
    await addTask({ label: "Stuck", assignedTo: "maya", status: "waiting" });
    await addTask({
      label: "Finished",
      assignedTo: "maya",
      status: "completed",
    });
    await addTask({ label: "Dropped", assignedTo: "maya", status: "blocked" });
    await addTask({
      label: "Not mine",
      assignedTo: "tomas",
      status: "in_progress",
    });

    const rows = await asMaya.query(api.taskUpdates.listMine, { projectId });
    expect(rows.map((r) => r.label)).toEqual(["Doing", "Stuck", "Later"]);
  });

  it("includes the date of the last update", async () => {
    const { projectId, addTask, asMaya } = await setup();
    const taskId = await addTask({
      assignedTo: "maya",
      status: "in_progress",
      actualStart: "2026-10-20",
    });
    await asMaya.mutation(api.taskUpdates.submit, {
      taskId,
      today: "2026-10-27",
      update: { kind: "progress", daysRemaining: 3 },
    });

    const [row] = await asMaya.query(api.taskUpdates.listMine, { projectId });
    expect(row).toMatchObject({
      daysRemaining: 3,
      lastUpdateDate: "2026-10-27",
    });
  });
});

describe("taskUpdates.submit", () => {
  it("records days left, starting a task that hadn't started", async () => {
    const { addTask, getTask, log, asMaya } = await setup();
    const taskId = await addTask({
      assignedTo: "maya",
      status: "todo",
      bestDays: 5,
    });

    await asMaya.mutation(api.taskUpdates.submit, {
      taskId,
      today: "2026-10-27",
      update: { kind: "progress", daysRemaining: 4 },
    });

    expect(await getTask(taskId)).toMatchObject({
      status: "in_progress",
      daysRemaining: 4,
      actualStart: "2026-10-27",
    });
    expect(await log(taskId)).toMatchObject([
      {
        userId: "maya",
        date: "2026-10-27",
        status: "in_progress",
        daysRemaining: 4,
      },
    ]);
  });

  it("keeps an existing start date", async () => {
    const { addTask, getTask, asMaya } = await setup();
    const taskId = await addTask({
      assignedTo: "maya",
      status: "in_progress",
      actualStart: "2026-10-20",
    });
    await asMaya.mutation(api.taskUpdates.submit, {
      taskId,
      today: "2026-10-27",
      update: { kind: "progress", daysRemaining: 2 },
    });
    expect((await getTask(taskId))?.actualStart).toBe("2026-10-20");
  });

  it("marks a task done on a date", async () => {
    const { addTask, getTask, log, asMaya } = await setup();
    const taskId = await addTask({
      assignedTo: "maya",
      status: "in_progress",
      actualStart: "2026-10-20",
      daysRemaining: 2,
    });
    await asMaya.mutation(api.taskUpdates.submit, {
      taskId,
      today: "2026-10-27",
      update: { kind: "done", finishDate: "2026-10-25" },
    });
    expect(await getTask(taskId)).toMatchObject({
      status: "completed",
      actualFinish: "2026-10-25",
      daysRemaining: 0,
    });
    expect(await log(taskId)).toMatchObject([
      { date: "2026-10-27", status: "completed", daysRemaining: 0 },
    ]);
  });

  it("sets Waiting on someone, optionally with days left", async () => {
    const { addTask, getTask, asMaya } = await setup();
    const taskId = await addTask({
      assignedTo: "maya",
      status: "in_progress",
      daysRemaining: 3,
    });
    await asMaya.mutation(api.taskUpdates.submit, {
      taskId,
      today: "2026-10-27",
      update: { kind: "waiting" },
    });
    expect(await getTask(taskId)).toMatchObject({
      status: "waiting",
      daysRemaining: 3,
    });
  });

  it("rejects bad updates", async () => {
    const { addTask, asMaya } = await setup();
    const taskId = await addTask({
      assignedTo: "maya",
      status: "in_progress",
      actualStart: "2026-10-20",
    });
    const submit = (
      update: Parameters<
        typeof asMaya.mutation<typeof api.taskUpdates.submit>
      >[1]["update"],
    ) =>
      asMaya.mutation(api.taskUpdates.submit, {
        taskId,
        today: "2026-10-27",
        update,
      });

    await expect(
      submit({ kind: "progress", daysRemaining: 0 }),
    ).rejects.toThrow(/Mark the task Done/);
    await expect(
      submit({ kind: "done", finishDate: "2026-10-28" }),
    ).rejects.toThrow(/future/);
    await expect(
      submit({ kind: "done", finishDate: "2026-10-19" }),
    ).rejects.toThrow(/before the start date/);
    await expect(
      submit({ kind: "done", finishDate: "Oct 25" }),
    ).rejects.toThrow();
  });

  it("refuses closed tasks", async () => {
    const { addTask, asMaya } = await setup();
    const taskId = await addTask({ assignedTo: "maya", status: "completed" });
    await expect(
      asMaya.mutation(api.taskUpdates.submit, {
        taskId,
        today: "2026-10-27",
        update: { kind: "progress", daysRemaining: 2 },
      }),
    ).rejects.toThrow(/already closed/);
  });

  it("lets a coach update someone's task, but not another member", async () => {
    const { addTask, log, asTomas, asCoach } = await setup();
    const taskId = await addTask({ assignedTo: "maya", status: "in_progress" });
    const update = {
      taskId,
      today: "2026-10-27",
      update: { kind: "progress" as const, daysRemaining: 2 },
    };

    await expect(
      asTomas.mutation(api.taskUpdates.submit, update),
    ).rejects.toThrow(/coach/);
    await asCoach.mutation(api.taskUpdates.submit, update);
    expect((await log(taskId))[0]?.userId).toBe("coach_user");
  });
});
