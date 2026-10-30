import type { FunctionReference } from "convex/server";
import { DashboardContext } from "@/components/dashboard/context";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Id } from "@amaxa/backend/_generated/dataModel";

import { GuidedSetup } from "./guided-setup";

const { queries, mutations, replaceMock, search } = vi.hoisted(() => ({
  queries: new Map<string, unknown>(),
  mutations: new Map<string, ReturnType<typeof vi.fn>>(),
  replaceMock: vi.fn(),
  search: { value: "" },
}));

const mutationFor = (name: string) => {
  let mock = mutations.get(name);
  if (!mock) {
    mock = vi.fn().mockResolvedValue(null);
    mutations.set(name, mock);
  }
  return mock;
};

vi.mock("convex/react", () => ({
  useQuery: (ref: FunctionReference<"query">) =>
    queries.get(getFunctionName(ref)),
  useMutation: (ref: FunctionReference<"mutation">) =>
    mutationFor(getFunctionName(ref)),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "p1", workspace: "cohort" }),
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(search.value),
}));

interface TaskSpec {
  id: string;
  label: string;
  owner?: string;
  best?: number;
  y?: number;
}

function load({
  tasks = [] as TaskSpec[],
  links = [] as [string, string][],
  canManage = true,
} = {}) {
  queries.set("projects:canManage", canManage);
  queries.set(
    "tasks:listForProject",
    tasks.map((t, i) => ({
      id: t.id,
      type: "task",
      position: { x: 0, y: t.y ?? i * 200 },
      data: {
        label: t.label,
        ...(t.owner ? { assignedTo: t.owner } : {}),
        ...(t.best === undefined ? {} : { bestDays: t.best }),
      },
    })),
  );
  queries.set(
    "edges:listForProject",
    links.map(([source, target]) => ({
      id: `${source}-${target}`,
      source,
      target,
    })),
  );
  queries.set("userToProjects:listUsersForProject", [
    { userId: "maya" },
    { userId: "tomas" },
  ]);
  queries.set("users:listAll", [
    { id: "maya", firstName: "Maya", lastName: "Lee" },
    { id: "tomas", firstName: "Tomas", lastName: "Ruiz" },
  ]);
}

function renderSetup(step: string, project: Record<string, unknown> = {}) {
  search.value = `step=${step}`;
  render(
    <DashboardContext.Provider
      value={{
        project: {
          id: "p1" as Id<"projects">,
          name: "Fundraiser",
          description: "",
          ccpmV2: true,
          ...project,
        },
        userRole: "coach",
      }}
    >
      <GuidedSetup />
    </DashboardContext.Provider>,
  );
}

beforeEach(() => {
  queries.clear();
  mutations.clear();
  replaceMock.mockReset();
  window.scrollTo = vi.fn();
});
afterEach(cleanup);

const planned = {
  tasks: [
    { id: "a", label: "Confirm story", owner: "maya", best: 5 },
    { id: "b", label: "Build page", owner: "tomas", best: 3 },
  ],
  links: [["a", "b"]] as [string, string][],
};

describe("Guided setup", () => {
  it("is for coaches only", () => {
    load({ canManage: false });
    renderSetup("goal");
    expect(
      screen.getByText("Only coaches can run the guided setup."),
    ).toBeTruthy();
  });

  it("lists all seven steps, each with a tip", () => {
    load();
    renderSetup("goal");
    const steps = screen.getByRole("navigation", { name: "Setup steps" });
    expect(steps.querySelectorAll("li")).toHaveLength(7);
    expect(screen.getByRole("note").textContent).toMatch(
      /result you.ll deliver/,
    );
  });

  it("saves the goal and dates, turns v2 on, and moves to the next step", async () => {
    load();
    renderSetup("goal", { ccpmV2: false });
    fireEvent.change(screen.getByLabelText("Goal"), {
      target: { value: "Raise £2,000 for the shelter" },
    });
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-11-02" },
    });
    fireEvent.change(screen.getByLabelText("Deadline"), {
      target: { value: "2027-01-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("?step=tasks", {
        scroll: false,
      }),
    );
    expect(mutationFor("projects:update")).toHaveBeenCalledWith({
      projectId: "p1",
      description: "Raise £2,000 for the shelter",
    });
    expect(mutationFor("projects:updateCcpmSettings")).toHaveBeenCalledWith({
      projectId: "p1",
      ccpmV2: true,
      startDate: "2026-11-02",
      deadline: "2027-01-15",
    });
  });

  it("won't save step 1 without a deadline", () => {
    load();
    renderSetup("goal", { description: "Raise money" });
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
    expect(screen.getByRole("alert").textContent).toBe(
      "Pick a start date and a deadline.",
    );
    expect(mutationFor("projects:updateCcpmSettings")).not.toHaveBeenCalled();
  });

  it("adds tasks one line at a time", async () => {
    load({ tasks: [{ id: "a", label: "Confirm story" }] });
    renderSetup("tasks");
    fireEvent.change(screen.getByLabelText("New task"), {
      target: { value: "Write story" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(mutationFor("tasks:create")).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "p1",
          data: { label: "Write story", status: "todo" },
        }),
      ),
    );
  });

  it("links tasks, and blocks links that would make a loop", async () => {
    load({
      tasks: [
        { id: "a", label: "Confirm story" },
        { id: "b", label: "Build page" },
        { id: "c", label: "Launch" },
      ],
      links: [["a", "b"]],
    });
    renderSetup("links");

    const needsForA = screen.getByRole("group", {
      name: "What Confirm story needs first",
    });
    const loop = needsForA.querySelector("button[disabled]");
    expect(loop?.textContent).toBe("Build page");

    const needsForC = screen.getByRole("group", {
      name: "What Launch needs first",
    });
    const buildPage = [...needsForC.querySelectorAll("button")].find(
      (b) => b.textContent === "Build page",
    );
    if (!buildPage) throw new Error("missing chip");
    fireEvent.click(buildPage);
    await waitFor(() =>
      expect(mutationFor("edges:create")).toHaveBeenCalledWith({
        projectId: "p1",
        source: "b",
        target: "c",
        type: "smoothstep",
      }),
    );
  });

  it("sends the reviewer back to estimates when some are missing", () => {
    load({
      tasks: [
        { id: "a", label: "Confirm story", best: 5 },
        { id: "b", label: "Build page" },
      ],
    });
    renderSetup("review", { startDate: "2026-11-02" });
    expect(
      screen.getByText(/1 task needs a best-case estimate: Build page/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add estimates" }));
    expect(replaceMock).toHaveBeenCalledWith("?step=estimates", {
      scroll: false,
    });
  });

  it("shows the chain with owners, and the project buffer", () => {
    load(planned);
    renderSetup("review", { startDate: "2026-11-02" });
    expect(screen.getByText("Critical chain: 8 days")).toBeTruthy();
    expect(screen.getByText(/· Maya Lee · 5 days/)).toBeTruthy();
    expect(screen.getByText(/4 days, after the last chain task/)).toBeTruthy();
  });

  it("lays out the chart in dependency order", async () => {
    load(planned);
    renderSetup("review", { startDate: "2026-11-02" });
    fireEvent.click(screen.getByRole("button", { name: "Arrange the chart" }));
    await waitFor(() =>
      expect(mutationFor("tasks:batchUpdatePositions")).toHaveBeenCalledWith({
        updates: [
          { taskId: "a", position: { x: 0, y: 0 } },
          { taskId: "b", position: { x: 360, y: 0 } },
        ],
      }),
    );
  });

  it("confirms the commitment date", async () => {
    load(planned);
    renderSetup("commit", {
      startDate: "2026-11-02",
      deadline: "2027-01-15",
    });
    // 8 chain days + 4 buffer days after Nov 2.
    const commit = screen.getByRole("button", { name: /^Commit to / });
    fireEvent.click(commit);
    await waitFor(() =>
      expect(mutationFor("projects:confirmCommitment")).toHaveBeenCalledWith({
        projectId: "p1",
        date: "2026-11-14",
      }),
    );
  });

  it("warns when the commitment is past the deadline", () => {
    load(planned);
    renderSetup("commit", {
      startDate: "2026-11-02",
      deadline: "2026-11-10",
    });
    expect(screen.getByRole("alert").textContent).toMatch(
      /needs 4 days more than the deadline allows/,
    );
    expect(
      screen.getByRole("button", { name: /^Commit anyway to / }),
    ).toBeTruthy();
  });

  it("shows when the current plan is already committed", () => {
    load(planned);
    renderSetup("commit", {
      startDate: "2026-11-02",
      deadline: "2027-01-15",
      commitment: { date: "2026-11-14", confirmedAt: 0, confirmedBy: "coach" },
    });
    expect(screen.getByText(/^Committed to /)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Commit to / })).toBeNull();
    const steps = screen.getByRole("navigation", { name: "Setup steps" });
    // Everything but step 1: this project has no goal written yet.
    expect(steps.querySelectorAll('[aria-label="done"]')).toHaveLength(6);
  });
});
