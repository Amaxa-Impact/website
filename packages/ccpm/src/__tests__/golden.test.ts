import { describe, expect, it } from "vitest";

import type { AnalyzeInput } from "../types";
import { analyze } from "../index";
import { must } from "../util";
import { checkpoints, iso, links, project, tasks } from "./fixture";

function run(input: AnalyzeInput) {
  const result = analyze(input);
  if (!result.ok) {
    throw new Error(`analyze failed: ${result.error.message}`);
  }
  return result;
}

const planning = (overrides: Partial<AnalyzeInput["project"]> = {}) =>
  run({ project: { ...project, ...overrides }, tasks, links, today: iso(0) });

describe("golden fixture: planning", () => {
  it("finds the critical chain T1-T6 of 32 days", () => {
    const { plan } = planning();
    expect(plan.chain).toEqual(["T1", "T2", "T3", "T4", "T5", "T6"]);
    expect(plan.chainDays).toBe(32);
  });

  it("sizes the project buffer at 16 days (half method)", () => {
    expect(planning().plan.projectBufferDays).toBe(16);
  });

  it("sizes the project buffer at 10 days with rss", () => {
    expect(planning({ bufferMethod: "rss" }).plan.projectBufferDays).toBe(10);
  });

  it("commits to day 48, before the day-56 deadline", () => {
    const { commitment } = planning().plan;
    expect(commitment.day).toBe(48);
    expect(commitment.date).toBe(iso(48));
    expect(commitment.afterDeadline).toBe(false);
  });

  it("builds feeding buffer A (F1-F2) as 5 days and says start now", () => {
    const fb = planning().plan.feedingBuffers.find((b) => b.id === "T4:F2");
    expect(fb).toMatchObject({
      mergeTaskId: "T4",
      taskIds: ["F1", "F2"],
      lengthDays: 9,
      sizeDays: 5,
      startNow: true,
    });
    expect(fb?.latestStart).toBeLessThan(0);
  });

  it("builds feeding buffer B (E1-E3) as 5 days with E1 latest start day 13", () => {
    const { plan } = planning();
    expect(plan.tasks.T6?.start).toBe(28);
    const fb = plan.feedingBuffers.find((b) => b.id === "T6:E3");
    expect(fb).toMatchObject({
      mergeTaskId: "T6",
      taskIds: ["E1", "E2", "E3"],
      lengthDays: 10,
      sizeDays: 5,
      latestStart: 13,
      latestStartDate: iso(13),
      startNow: false,
    });
  });

  it("has exactly those two feeding buffers and no owner conflicts", () => {
    const { plan } = planning();
    expect(plan.feedingBuffers.map((b) => b.id).sort()).toEqual([
      "T4:F2",
      "T6:E3",
    ]);
    expect(plan.ownerConflicts).toEqual([]);
    expect(plan.excluded).toEqual([]);
  });
});

describe("golden fixture: execution checkpoints", () => {
  it.each(checkpoints.map((c) => [`day ${c.today}`, c] as const))(
    "%s",
    (_name, c) => {
      const { projection, warnings } = run(c.input);
      expect(warnings).toEqual([]);
      expect(projection.chainCompletePct).toBeCloseTo(c.chainCompletePct, 1);
      expect(projection.bufferUsedDays).toBe(c.bufferUsedDays);
      expect(projection.bufferUsedPct).toBeCloseTo(c.bufferUsedPct, 2);
      expect(projection.zone).toBe(c.zone);
    },
  );

  it("reports the finish range against the deadline", () => {
    const { projection } = run(must(checkpoints[2]).input);
    expect(projection.finish).toMatchObject({
      earliestDay: 47,
      latestDay: 48,
      earliest: iso(47),
      latest: iso(48),
      earliestVsDeadline: -9,
      latestVsDeadline: -8,
    });

    // Behind plan on day 7: the latest finish is the commitment, not earlier.
    const early = run(must(checkpoints[0]).input).projection.finish;
    expect(early.earliestDay).toBe(37);
    expect(early.latestDay).toBe(48);
  });
});

describe("golden fixture: priority", () => {
  const day7 = () => run(must(checkpoints[0]).input).priority;

  it("points each owner at something they can act on today", () => {
    const owners = Object.fromEntries(
      day7().byOwner.map((o) => [o.ownerId, o]),
    );
    expect(owners.Maya).toMatchObject({ taskId: "T1", ready: true });
    expect(owners.Maya?.reason).toMatch(/critical chain/);
    // T5 is on the chain but can't start for weeks; Aisha's feeding work wins.
    expect(owners.Aisha).toMatchObject({ taskId: "F1", ready: true });
    expect(owners.Aisha?.reason).toMatch(/Launch campaign/);
    expect(owners.Jordan).toMatchObject({ taskId: "E1", ready: true });
    expect(owners.Jordan?.reason).toMatch(/Wrap up/);
  });

  it("ranks chain tasks before feeding tasks", () => {
    const ranked = day7().ranked.map((r) => r.taskId);
    expect(ranked.indexOf("T1")).toBeLessThan(ranked.indexOf("F1"));
    expect(ranked.slice(0, 5).every((id) => id.startsWith("T"))).toBe(true);
  });
});
