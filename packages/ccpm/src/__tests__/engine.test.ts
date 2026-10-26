import { describe, expect, it } from "vitest";

import type { AnalyzeInput, EngineLink, EngineTask } from "../types";
import { analyze, zoneFor } from "../index";
import { must } from "../util";

const START = "2026-09-07";
const day = (n: number) => {
  const d = new Date(Date.UTC(2026, 8, 7 + n));
  return d.toISOString().slice(0, 10);
};

const task = (
  id: string,
  bestDays: number,
  extra: Partial<EngineTask> = {},
): EngineTask => ({ id, bestDays, status: "todo", ...extra });

const chain = (...ids: string[]): EngineLink[] =>
  ids.slice(1).map((to, i) => ({ from: must(ids[i]), to }));

function run(
  tasks: EngineTask[],
  links: EngineLink[] = [],
  options: {
    today?: number;
    project?: Partial<AnalyzeInput["project"]>;
  } = {},
) {
  const result = analyze({
    project: { startDate: START, ...options.project },
    tasks,
    links,
    today: day(options.today ?? 0),
  });
  if (!result.ok) {
    throw new Error(`analyze failed: ${result.error.message}`);
  }
  return result;
}

function fail(input: AnalyzeInput) {
  const result = analyze(input);
  if (result.ok) {
    throw new Error("expected analyze to fail");
  }
  return result.error;
}

describe("empty and tiny projects", () => {
  it("handles an empty project without NaN", () => {
    const { plan, projection, priority } = run([]);
    expect(plan.chain).toEqual([]);
    expect(plan.chainDays).toBe(0);
    expect(plan.projectBufferDays).toBe(0);
    expect(plan.commitment.day).toBe(0);
    expect(projection.bufferUsedDays).toBe(0);
    expect(projection.bufferUsedPct).toBe(0);
    expect(projection.chainCompletePct).toBe(0);
    expect(projection.zone).toBe("green");
    expect(priority.ranked).toEqual([]);
    expect(priority.byOwner).toEqual([]);
  });

  it("handles a single task", () => {
    const { plan, projection } = run([task("A", 5)]);
    expect(plan.chain).toEqual(["A"]);
    expect(plan.projectBufferDays).toBe(3); // ceil(2.5)
    expect(plan.commitment.day).toBe(8);
    expect(projection.chainProjectedFinish).toBe(5);
    expect(projection.bufferUsedDays).toBe(0);
  });
});

describe("validation", () => {
  it("names the tasks in a cycle", () => {
    const error = fail({
      project: { startDate: START },
      tasks: [
        task("A", 1, { title: "Draft" }),
        task("B", 1, { title: "Review" }),
        task("C", 1, { title: "Publish" }),
        task("D", 1),
      ],
      links: [...chain("A", "B", "C", "A"), { from: "C", to: "D" }],
      today: START,
    });
    expect(error.kind).toBe("cycle");
    expect(error.taskIds.sort()).toEqual(["A", "B", "C"]);
    expect(error.message).toMatch(/Draft → Review → Publish → Draft/);
  });

  it("treats a task linked to itself as a cycle", () => {
    const error = fail({
      project: { startDate: START },
      tasks: [task("A", 1)],
      links: [{ from: "A", to: "A" }],
      today: START,
    });
    expect(error).toMatchObject({ kind: "cycle", taskIds: ["A"] });
  });

  it("rejects links to unknown tasks", () => {
    const error = fail({
      project: { startDate: START },
      tasks: [task("A", 1)],
      links: [{ from: "A", to: "ghost" }],
      today: START,
    });
    expect(error).toMatchObject({ kind: "unknown_task", taskIds: ["ghost"] });
  });

  it("asks for estimates instead of guessing", () => {
    const error = fail({
      project: { startDate: START },
      tasks: [task("A", 2), { id: "B", status: "todo" }, task("C", 0)],
      links: [],
      today: START,
    });
    expect(error).toMatchObject({
      kind: "missing_estimates",
      taskIds: ["B", "C"],
    });
  });

  it("rejects impossible dates", () => {
    expect(
      fail({
        project: { startDate: "2026-02-31" },
        tasks: [],
        links: [],
        today: START,
      }).kind,
    ).toBe("invalid_date");
    expect(
      fail({
        project: { startDate: START },
        tasks: [task("A", 1, { actualStart: "yesterday" })],
        links: [],
        today: START,
      }),
    ).toMatchObject({ kind: "invalid_date", taskIds: ["A"] });
    expect(
      fail({
        project: { startDate: START },
        tasks: [],
        links: [],
        today: "nope",
      }).kind,
    ).toBe("invalid_date");
  });

  it("ignores duplicate links", () => {
    const { plan } = run(
      [task("A", 2), task("B", 3)],
      [...chain("A", "B"), ...chain("A", "B")],
    );
    expect(plan.chain).toEqual(["A", "B"]);
    expect(plan.chainDays).toBe(5);
  });
});

describe("ties", () => {
  const tasks = [task("X", 4), task("Y", 4), task("Z", 1)];

  it("breaks equal-length chains by task id", () => {
    expect(run(tasks).plan.chain).toEqual(["X"]);
  });

  it("gives the same answer whatever order the input arrives in", () => {
    const reversed = run([...tasks].reverse());
    expect(reversed.plan.chain).toEqual(["X"]);
    expect(reversed.plan).toEqual(run(tasks).plan);
  });

  it("picks the lowest id among equal predecessors", () => {
    const { plan } = run(
      [task("B", 3), task("A", 3), task("C", 2)],
      [
        { from: "A", to: "C" },
        { from: "B", to: "C" },
      ],
    );
    expect(plan.chain).toEqual(["A", "C"]);
  });
});

describe("estimates", () => {
  it("defaults the safe estimate to best x 1.5 for rss", () => {
    // gaps: 2 and 3 -> sqrt(4 + 9) = 3.6 -> 4
    const { plan } = run([task("A", 4), task("B", 6)], chain("A", "B"), {
      project: { bufferMethod: "rss" },
    });
    expect(plan.projectBufferDays).toBe(4);
  });

  it("uses the project's safe ratio setting", () => {
    // ratio 2 -> gaps 4 and 6 -> sqrt(16 + 36) = 7.2 -> 8
    const { plan } = run([task("A", 4), task("B", 6)], chain("A", "B"), {
      project: { bufferMethod: "rss", safeRatio: 2 },
    });
    expect(plan.projectBufferDays).toBe(8);
  });

  it("prefers an explicit safe estimate over the ratio", () => {
    // gap 5 -> 5
    const { plan } = run([task("A", 4, { safeDays: 9 })], [], {
      project: { bufferMethod: "rss" },
    });
    expect(plan.projectBufferDays).toBe(5);
  });

  it("never lets a safe estimate fall below best", () => {
    const { plan } = run([task("A", 4, { safeDays: 1 })], [], {
      project: { bufferMethod: "rss" },
    });
    expect(plan.projectBufferDays).toBe(0);
  });

  it("gives short feeding chains the minimum buffer of 3 days", () => {
    const { plan } = run(
      [task("F", 1), task("A", 10), task("B", 10)],
      [...chain("A", "B"), { from: "F", to: "B" }],
    );
    const fb = plan.feedingBuffers[0];
    expect(fb?.lengthDays).toBe(1);
    expect(fb?.sizeDays).toBe(3);
  });
});

describe("deadline", () => {
  it("warns when the commitment lands after the deadline", () => {
    const { plan } = run([task("A", 10)], [], {
      project: { deadline: day(12) },
    });
    // 10 + ceil(5) = 15
    expect(plan.commitment).toMatchObject({
      day: 15,
      afterDeadline: true,
      daysOverDeadline: 3,
    });
  });

  it("reports no overrun without a deadline", () => {
    const { plan, projection } = run([task("A", 10)]);
    expect(plan.commitment.afterDeadline).toBe(false);
    expect(projection.finish.earliestVsDeadline).toBeUndefined();
  });
});

describe("progress", () => {
  it("is ahead of schedule when work finishes early", () => {
    const tasks = [
      task("A", 10, {
        status: "completed",
        actualStart: day(0),
        actualFinish: day(6),
      }),
      task("B", 10),
    ];
    const { projection, plan } = run(tasks, chain("A", "B"), { today: 6 });
    expect(plan.chainDays).toBe(20);
    expect(projection.chainProjectedFinish).toBe(16);
    expect(projection.bufferUsedDays).toBe(-4);
    expect(projection.bufferUsedPct).toBe(0);
    expect(projection.zone).toBe("green");
  });

  it("is 100% complete with nothing left to do when everything is done", () => {
    const tasks = [
      task("A", 2, {
        ownerId: "m",
        status: "completed",
        actualStart: day(0),
        actualFinish: day(2),
      }),
      task("B", 3, {
        ownerId: "m",
        status: "completed",
        actualStart: day(2),
        actualFinish: day(6),
      }),
    ];
    const { projection, priority } = run(tasks, chain("A", "B"), { today: 6 });
    expect(projection.chainCompletePct).toBe(100);
    expect(projection.bufferUsedDays).toBe(1);
    expect(projection.zone).toBe("green");
    expect(priority.ranked).toEqual([]);
    expect(priority.byOwner).toEqual([]);
  });

  it("clamps today to the project start", () => {
    const { projection } = run([task("A", 5)], [], { today: -10 });
    expect(projection.today).toBe(0);
    expect(projection.chainProjectedFinish).toBe(5);
  });

  it("falls back and warns when updates are incomplete", () => {
    const tasks = [
      task("A", 6, { status: "in_progress", actualStart: day(2) }),
      task("B", 2, { status: "completed" }),
      task("C", 2, { status: "in_progress", daysRemaining: 1 }),
    ];
    const { warnings, projection } = run(tasks, [], { today: 4 });
    expect(warnings.map((w) => [w.code, w.taskId]).sort()).toEqual([
      ["missing_actual_finish", "B"],
      ["missing_actual_start", "C"],
      ["missing_days_remaining", "A"],
    ]);
    // A: started day 2, 2 elapsed, 6 - 2 = 4 left -> finishes day 8.
    expect(projection.tasks.A?.finish).toBe(8);
  });

  it("counts a started waiting task like an in-progress one", () => {
    const tasks = [
      task("A", 10, {
        status: "waiting",
        actualStart: day(0),
        daysRemaining: 4,
      }),
    ];
    const { projection } = run(tasks, [], { today: 6 });
    expect(projection.tasks.A?.finish).toBe(10);
    expect(projection.chainCompletePct).toBeCloseTo(60, 5);
  });
});

describe("Unable to Complete", () => {
  const tasks = [
    task("A", 3),
    task("B", 8, { status: "blocked" }), // no estimate needed either
    task("C", 2),
    task("D", 4),
  ];
  const links = [...chain("A", "B", "C"), { from: "A", to: "D" }];

  it("drops the task and its links, and logs it", () => {
    const { plan } = run(tasks, links);
    expect(plan.excluded).toEqual([
      { taskId: "B", reason: "unable_to_complete" },
    ]);
    expect(Object.keys(plan.tasks).sort()).toEqual(["A", "C", "D"]);
    // With B gone, C no longer waits for A: D (A -> D) is the longest path.
    expect(plan.chain).toEqual(["A", "D"]);
    expect(plan.chainDays).toBe(7);
  });

  it("does not need an estimate on an excluded task", () => {
    const result = analyze({
      project: { startDate: START },
      tasks: [{ id: "B", status: "blocked" }, task("A", 2)],
      links: [{ from: "A", to: "B" }],
      today: START,
    });
    expect(result.ok).toBe(true);
  });

  it("excludes it from remaining work and priority", () => {
    const { priority } = run(tasks, links);
    expect(priority.ranked.map((r) => r.taskId)).not.toContain("B");
  });
});

describe("owner conflicts", () => {
  it("flags one owner with overlapping planned windows", () => {
    const { plan } = run([
      task("A", 5, { ownerId: "Maya" }),
      task("B", 5, { ownerId: "Maya" }),
      task("C", 5, { ownerId: "Tomas" }),
    ]);
    expect(plan.ownerConflicts).toEqual([
      { ownerId: "Maya", taskIds: ["A", "B"] },
    ]);
  });

  it("does not flag back-to-back or different-owner tasks", () => {
    const { plan } = run(
      [
        task("A", 5, { ownerId: "Maya" }),
        task("B", 5, { ownerId: "Maya" }),
        task("C", 5, { ownerId: "Tomas" }),
      ],
      chain("A", "B"),
    );
    expect(plan.ownerConflicts).toEqual([]);
  });
});

describe("priority when someone is waiting", () => {
  // Maya waits on a partner for A; B depends on A; C is independent.
  const tasks = [
    task("A", 3, {
      ownerId: "Maya",
      title: "Partner reply",
      status: "waiting",
    }),
    task("B", 3, { ownerId: "Maya", title: "Write story" }),
    task("C", 2, { ownerId: "Maya", title: "Tidy the photo folder" }),
  ];

  it("points her at the highest-ranked task that doesn't depend on the blocker", () => {
    const { priority } = run(tasks, chain("A", "B"));
    const maya = priority.byOwner.find((o) => o.ownerId === "Maya");
    expect(maya).toMatchObject({ taskId: "C", ready: true });
  });

  it("says so when everything depends on the blocker", () => {
    const { priority } = run(tasks.slice(0, 2), chain("A", "B"));
    const maya = priority.byOwner.find((o) => o.ownerId === "Maya");
    expect(maya?.taskId).toBeNull();
    expect(maya?.reason).toMatch(/Partner reply/);
  });
});

describe("zone boundaries", () => {
  it("is green on or below the green line", () => {
    expect(zoneFor(0, 0)).toBe("green");
    expect(zoneFor(50, 30)).toBe("green"); // exactly on 0.6x
    expect(zoneFor(100, 60)).toBe("green");
  });

  it("is yellow between the lines", () => {
    expect(zoneFor(0, 1)).toBe("yellow");
    expect(zoneFor(50, 30.01)).toBe("yellow");
    expect(zoneFor(50, 59.99)).toBe("yellow");
    expect(zoneFor(100, 89.99)).toBe("yellow");
  });

  it("is red on or above the red line", () => {
    expect(zoneFor(0, 30)).toBe("red"); // 30 at x = 0
    expect(zoneFor(50, 60)).toBe("red"); // exactly on 30 + 0.6x
    expect(zoneFor(100, 90)).toBe("red");
    expect(zoneFor(20, 150)).toBe("red");
  });
});
