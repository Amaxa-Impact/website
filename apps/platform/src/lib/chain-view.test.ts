import { describe, expect, it } from "vitest";

import type { Box, ChainTaskInput, ChainView } from "./chain-view";
import {
  BUFFER_BOX,
  buildChainView,
  formatPlanDate,
  linkKey,
  localIsoDate,
  placeBuffers,
} from "./chain-view";

// The golden fixture from the build brief: chain T1–T6 (32 days), feeding
// chains F1–F2 into T4 and E1–E3 into T6.
const rows: [string, string, number, number][] = [
  ["T1", "maya", 5, 10],
  ["T2", "maya", 4, 7],
  ["T3", "tomas", 3, 5],
  ["T4", "tomas", 2, 3],
  ["T5", "aisha", 14, 21],
  ["T6", "maya", 4, 7],
  ["F1", "aisha", 5, 9],
  ["F2", "aisha", 4, 7],
  ["E1", "jordan", 6, 12],
  ["E2", "jordan", 3, 5],
  ["E3", "jordan", 1, 1],
];
const goldenTasks: ChainTaskInput[] = rows.map(([id, owner, best, safe]) => ({
  id,
  data: { label: id, assignedTo: owner, bestDays: best, safeDays: safe },
}));
const goldenLinks = [
  ["T1", "T2"],
  ["T2", "T3"],
  ["T3", "T4"],
  ["F2", "T4"],
  ["T4", "T5"],
  ["T5", "T6"],
  ["E3", "T6"],
  ["F1", "F2"],
  ["E1", "E2"],
  ["E2", "E3"],
].map(([source, target]) => ({ source: source ?? "", target: target ?? "" }));

const project = { startDate: "2026-01-05", deadline: "2026-03-02" };

function ready(view: ChainView) {
  if (view.status !== "ready") {
    throw new Error(`expected a ready view, got ${view.status}`);
  }
  return view;
}

describe("buildChainView", () => {
  it("finds the chain and sizes the buffers (golden fixture)", () => {
    const view = ready(
      buildChainView({
        project,
        tasks: goldenTasks,
        links: goldenLinks,
        today: "2026-01-05",
      }),
    );

    expect(view.chain).toEqual(["T1", "T2", "T3", "T4", "T5", "T6"]);
    expect(view.chainDays).toBe(32);
    expect(view.projectBufferDays).toBe(16);
    expect(
      view.feedingBuffers.map((fb) => [
        fb.endTaskId,
        fb.mergeTaskId,
        fb.sizeDays,
        fb.startNow,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["F2", "T4", 5, true],
        ["E3", "T6", 5, false],
      ]),
    );
    expect(view.chainLinks.has(linkKey("T3", "T4"))).toBe(true);
    expect(view.chainLinks.has(linkKey("F2", "T4"))).toBe(false);
    expect(view.overlaps.size).toBe(0);
    expect(view.datesKnown).toBe(true);
  });

  it("gives the finish range and commitment (golden fixture, day 0)", () => {
    const view = ready(
      buildChainView({
        project,
        tasks: goldenTasks,
        links: goldenLinks,
        today: "2026-01-05",
      }),
    );
    // Chain finishes on day 32; commitment is day 48 (32 + 16), before day 56.
    expect(view.finish).toEqual({
      earliest: "2026-02-06",
      latest: "2026-02-22",
    });
    expect(view.commitment).toEqual({
      date: "2026-02-22",
      daysOverDeadline: 0,
    });
    expect(view.progressWarnings).toEqual([]);
  });

  it("counts the days the commitment runs past the deadline", () => {
    const view = ready(
      buildChainView({
        project: { ...project, deadline: "2026-02-15" },
        tasks: goldenTasks,
        links: goldenLinks,
        today: "2026-01-05",
      }),
    );
    expect(view.commitment.daysOverDeadline).toBe(7);
  });

  it("moves the finish range with progress (golden checkpoint, day 7)", () => {
    const tasks = goldenTasks.map((t) =>
      t.id === "T1"
        ? {
            ...t,
            data: {
              ...t.data,
              status: "in_progress" as const,
              actualStart: "2026-01-05",
              daysRemaining: 3,
            },
          }
        : t,
    );
    const view = ready(
      buildChainView({
        project,
        tasks,
        links: goldenLinks,
        today: "2026-01-12",
      }),
    );
    // Buffer used is 5 days, so the chain now finishes on day 37.
    expect(view.finish.earliest).toBe("2026-02-11");
    expect(view.finish.latest).toBe("2026-02-22");
  });

  it("reports progress the projection had to guess", () => {
    const tasks = goldenTasks.map((t) =>
      t.id === "T1"
        ? { ...t, data: { ...t.data, status: "in_progress" as const } }
        : t,
    );
    const view = ready(
      buildChainView({
        project,
        tasks,
        links: goldenLinks,
        today: "2026-01-12",
      }),
    );
    expect(view.progressWarnings.length).toBeGreaterThan(0);
  });

  it("uses the project's buffer method", () => {
    const view = ready(
      buildChainView({
        project: { ...project, bufferMethod: "rss" },
        tasks: goldenTasks,
        links: goldenLinks,
        today: "2026-01-05",
      }),
    );
    expect(view.projectBufferDays).toBe(10);
  });

  it("flags one owner on two tasks at the same time, by name", () => {
    const view = ready(
      buildChainView({
        project,
        tasks: [
          {
            id: "a",
            data: { label: "Write story", assignedTo: "maya", bestDays: 4 },
          },
          {
            id: "b",
            data: { label: "Take photos", assignedTo: "maya", bestDays: 3 },
          },
          {
            id: "c",
            data: { label: "Publish", assignedTo: "tomas", bestDays: 1 },
          },
        ],
        links: [
          { source: "a", target: "c" },
          { source: "b", target: "c" },
        ],
        today: "2026-01-05",
      }),
    );
    expect(view.overlaps.get("a")).toEqual(["Take photos"]);
    expect(view.overlaps.get("b")).toEqual(["Write story"]);
    expect(view.overlaps.has("c")).toBe(false);
  });

  it("ignores an empty owner", () => {
    const view = ready(
      buildChainView({
        project,
        tasks: [
          { id: "a", data: { assignedTo: "", bestDays: 4 } },
          { id: "b", data: { assignedTo: "", bestDays: 3 } },
        ],
        links: [],
        today: "2026-01-05",
      }),
    );
    expect(view.overlaps.size).toBe(0);
  });

  it("asks for the missing estimates", () => {
    const view = buildChainView({
      project,
      tasks: [
        { id: "a", data: { bestDays: 2 } },
        { id: "b", data: {} },
      ],
      links: [],
      today: "2026-01-05",
    });
    expect(view).toEqual({ status: "needs_estimates", taskIds: ["b"] });
  });

  it("explains a loop by task name", () => {
    const view = buildChainView({
      project,
      tasks: [
        { id: "a", data: { label: "Plan", bestDays: 2 } },
        { id: "b", data: { label: "Do", bestDays: 2 } },
      ],
      links: [
        { source: "a", target: "b" },
        { source: "b", target: "a" },
      ],
      today: "2026-01-05",
    });
    expect(view.status).toBe("cycle");
    if (view.status === "cycle") {
      expect(view.message).toMatch(/Plan/);
      expect(view.message).toMatch(/Do/);
    }
  });

  it("returns empty for a project with no tasks", () => {
    expect(
      buildChainView({ project, tasks: [], links: [], today: "2026-01-05" }),
    ).toEqual({ status: "empty" });
  });

  it("still finds the chain without a start date, but marks dates unknown", () => {
    const view = ready(
      buildChainView({
        project: {},
        tasks: goldenTasks,
        links: goldenLinks,
        today: "2026-01-05",
      }),
    );
    expect(view.projectBufferDays).toBe(16);
    expect(view.datesKnown).toBe(false);
  });
});

describe("placeBuffers", () => {
  const box = (x: number, y: number): Box => ({
    x,
    y,
    width: 200,
    height: 100,
  });

  it("puts the project buffer after the last chain task, centred on it", () => {
    const view = ready(
      buildChainView({
        project,
        tasks: [{ id: "a", data: { bestDays: 4 } }],
        links: [],
        today: "2026-01-05",
      }),
    );
    const [pb] = placeBuffers(view, new Map([["a", box(0, 0)]]));
    expect(pb).toMatchObject({
      kind: "project",
      afterTaskId: "a",
      sizeDays: 2,
    });
    expect(pb?.x).toBe(200 + 80);
    expect(pb?.y).toBe((100 - BUFFER_BOX.height) / 2);
  });

  it("puts a feeding buffer halfway along the link it protects", () => {
    const view = ready(
      buildChainView({
        project,
        tasks: goldenTasks,
        links: goldenLinks,
        today: "2026-01-05",
      }),
    );
    const boxes = new Map(goldenTasks.map((t) => [t.id, box(0, 0)]));
    boxes.set("E3", box(0, 300));
    boxes.set("T6", box(400, 100));

    const fb = placeBuffers(view, boxes).find(
      (p) => p.kind === "feeding" && p.id.includes("T6"),
    );
    // Halfway between E3's right edge (200, 350) and T6's left edge (400, 150).
    expect(fb).toMatchObject({
      x: 300 - BUFFER_BOX.width / 2,
      y: 250 - BUFFER_BOX.height / 2,
      sizeDays: 5,
      startNow: false,
      latestStartDate: "2026-01-18",
    });
  });

  it("moves a feeding buffer below its chain when the link is too short", () => {
    const view = ready(
      buildChainView({
        project,
        tasks: goldenTasks,
        links: goldenLinks,
        today: "2026-01-05",
      }),
    );
    // Tasks spread far apart, except E3 sitting just left of T6.
    const boxes = new Map(
      goldenTasks.map((t, i) => [t.id, box(i * 1000, 2000)]),
    );
    boxes.set("E3", box(0, 0));
    boxes.set("T6", box(240, 0));

    const fb = placeBuffers(view, boxes).find(
      (p) => p.kind === "feeding" && p.id.includes("T6"),
    );
    expect(fb).toMatchObject({
      x: (200 - BUFFER_BOX.width) / 2,
      y: 100 + 24,
    });
  });

  it("never puts two buffers on the same spot", () => {
    const view = ready(
      buildChainView({
        project,
        tasks: goldenTasks,
        links: goldenLinks,
        today: "2026-01-05",
      }),
    );
    const boxes = new Map(goldenTasks.map((t) => [t.id, box(0, 0)]));
    const spots = placeBuffers(view, boxes).map((p) => `${p.x},${p.y}`);
    expect(new Set(spots).size).toBe(spots.length);
  });

  it("leaves out dates when the project has no start date", () => {
    const view = ready(
      buildChainView({
        project: {},
        tasks: goldenTasks,
        links: goldenLinks,
        today: "2026-01-05",
      }),
    );
    const boxes = new Map(goldenTasks.map((t) => [t.id, box(0, 0)]));
    for (const p of placeBuffers(view, boxes)) {
      expect(p).not.toHaveProperty("latestStartDate");
    }
  });

  it("skips buffers whose tasks aren't on the canvas yet", () => {
    const view = ready(
      buildChainView({
        project,
        tasks: goldenTasks,
        links: goldenLinks,
        today: "2026-01-05",
      }),
    );
    expect(placeBuffers(view, new Map())).toEqual([]);
  });
});

describe("formatPlanDate", () => {
  it("leaves the year out for dates this year", () => {
    expect(formatPlanDate("2026-03-02", "2026-10-29")).toMatch(/Mar/);
    expect(formatPlanDate("2026-03-02", "2026-10-29")).not.toMatch(/2026/);
  });

  it("adds the year for other years", () => {
    expect(formatPlanDate("2027-01-04", "2026-10-29")).toMatch(/2027/);
  });
});

describe("localIsoDate", () => {
  it("formats the local calendar date", () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
