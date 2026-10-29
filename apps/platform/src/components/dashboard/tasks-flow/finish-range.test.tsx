import type { ChainView } from "@/lib/chain-view";
import { formatPlanDate } from "@/lib/chain-view";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FinishRange } from "./finish-range";

afterEach(cleanup);

function readyView(
  overrides: Partial<Extract<ChainView, { status: "ready" }>> = {},
): ChainView {
  return {
    status: "ready",
    chain: ["a"],
    chainDays: 32,
    projectBufferDays: 16,
    feedingBuffers: [],
    chainLinks: new Set(),
    overlaps: new Map(),
    datesKnown: true,
    finish: { earliest: "2026-02-06", latest: "2026-02-22" },
    commitment: { date: "2026-02-22", daysOverDeadline: 0 },
    progressWarnings: [],
    ...overrides,
  };
}

const text = () =>
  screen.getByRole("region", { name: "Finish range" }).textContent;

describe("FinishRange", () => {
  it("shows the likely finish range and the deadline", () => {
    render(
      <FinishRange
        deadline="2026-03-02"
        settingsHref="/s"
        view={readyView()}
      />,
    );
    expect(text()).toContain(
      `Likely finish: ${formatPlanDate("2026-02-06")} – ${formatPlanDate("2026-02-22")}`,
    );
    expect(text()).toContain(`Deadline: ${formatPlanDate("2026-03-02")}`);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows one date when the range has closed", () => {
    render(
      <FinishRange
        deadline="2026-03-02"
        settingsHref="/s"
        view={readyView({
          finish: { earliest: "2026-02-22", latest: "2026-02-22" },
        })}
      />,
    );
    expect(text()).toContain(
      `Likely finish: ${formatPlanDate("2026-02-22")} ·`,
    );
  });

  it("warns when the commitment is after the deadline", () => {
    render(
      <FinishRange
        deadline="2026-02-15"
        settingsHref="/s"
        view={readyView({
          commitment: { date: "2026-02-22", daysOverDeadline: 7 },
        })}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      `The plan needs until ${formatPlanDate("2026-02-22")}, 7 days past the deadline`,
    );
  });

  it("links to settings when there's no deadline or start date", () => {
    render(
      <FinishRange settingsHref="/s" view={readyView({ datesKnown: false })} />,
    );
    expect(screen.getByText("set a start date").getAttribute("href")).toBe(
      "/s",
    );
    expect(screen.getByText("not set").getAttribute("href")).toBe("/s");
  });

  it("waits for the chain before showing a finish", () => {
    render(
      <FinishRange
        deadline="2026-03-02"
        settingsHref="/s"
        view={{ status: "needs_estimates", taskIds: ["a"] }}
      />,
    );
    expect(text()).toContain(
      "Likely finish: appears once the critical chain can be worked out",
    );
  });

  it("says when the range rests on incomplete updates", () => {
    render(
      <FinishRange
        deadline="2026-03-02"
        settingsHref="/s"
        view={readyView({
          progressWarnings: [
            { taskId: "a", message: "no start" },
            { taskId: "a", message: "no days remaining" },
          ],
        })}
      />,
    );
    expect(text()).toContain(
      "(rough: 1 task is missing start, finish or days-left details)",
    );
  });
});
