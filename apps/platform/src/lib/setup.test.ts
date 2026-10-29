import { describe, expect, it } from "vitest";

import type { SetupState } from "./setup";
import { buildChainView } from "./chain-view";
import {
  completedSteps,
  layeredLayout,
  LAYOUT_GAP,
  wouldCreateLoop,
} from "./setup";

const link = (source: string, target: string) => ({ source, target });

describe("wouldCreateLoop", () => {
  const links = [link("a", "b"), link("b", "c")];

  it("spots a link that closes a loop", () => {
    expect(wouldCreateLoop(links, "c", "a")).toBe(true);
    expect(wouldCreateLoop(links, "a", "a")).toBe(true);
  });

  it("allows links that keep the chain flowing one way", () => {
    expect(wouldCreateLoop(links, "a", "c")).toBe(false);
    expect(wouldCreateLoop(links, "d", "a")).toBe(false);
  });
});

describe("layeredLayout", () => {
  it("puts each task one column after its deepest predecessor", () => {
    const positions = layeredLayout(
      ["a", "b", "c", "d"],
      [link("a", "b"), link("b", "d"), link("c", "d")],
    );
    expect(positions.get("a")).toEqual({ x: 0, y: 0 });
    expect(positions.get("c")).toEqual({ x: 0, y: LAYOUT_GAP.y });
    expect(positions.get("b")).toEqual({ x: LAYOUT_GAP.x, y: 0 });
    expect(positions.get("d")).toEqual({ x: 2 * LAYOUT_GAP.x, y: 0 });
  });

  it("still places every task when links loop", () => {
    const positions = layeredLayout(
      ["a", "b"],
      [link("a", "b"), link("b", "a")],
    );
    expect(positions.size).toBe(2);
  });

  it("ignores links to tasks it wasn't given", () => {
    const positions = layeredLayout(["a"], [link("x", "a")]);
    expect(positions.get("a")).toEqual({ x: 0, y: 0 });
  });
});

describe("completedSteps", () => {
  const tasks = [
    { id: "a", label: "Plan", assignedTo: "maya", bestDays: 3 },
    { id: "b", label: "Do", assignedTo: "tomas", bestDays: 2 },
  ];
  const links = [link("a", "b")];
  const project = { startDate: "2026-01-05", deadline: "2026-03-02" };
  const chainView = buildChainView({
    project,
    tasks: tasks.map(({ id, label, assignedTo, bestDays }) => ({
      id,
      data: { label, assignedTo, bestDays },
    })),
    links,
    today: "2026-01-05",
  });
  const full: SetupState = {
    goal: "Raise £2,000",
    ...project,
    tasks,
    links,
    chainView,
  };

  it("ticks everything but commit until the date is confirmed", () => {
    expect([...completedSteps(full)]).toEqual([
      "goal",
      "tasks",
      "links",
      "owners",
      "estimates",
      "review",
    ]);
  });

  it("ticks commit only for the current commitment date", () => {
    if (chainView.status !== "ready") throw new Error("expected ready");
    expect(
      completedSteps({ ...full, committedDate: chainView.commitment.date }).has(
        "commit",
      ),
    ).toBe(true);
    expect(
      completedSteps({ ...full, committedDate: "2026-01-06" }).has("commit"),
    ).toBe(false);
  });

  it("leaves steps open while anything is missing", () => {
    const done = completedSteps({
      goal: "",
      tasks: [{ id: "a" }],
      links: [],
      chainView: null,
    });
    expect(done.size).toBe(0);
  });
});
