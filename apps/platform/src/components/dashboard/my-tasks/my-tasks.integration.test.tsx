import { DashboardContext } from "@/components/dashboard/context";
import { localIsoDate } from "@/lib/chain-view";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ConvexError } from "convex/values";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Id } from "@amaxa/backend/_generated/dataModel";

import { MyTasks } from "./my-tasks";

const { submitMock, useQueryMock } = vi.hoisted(() => ({
  submitMock: vi.fn(),
  useQueryMock: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useMutation: () => submitMock,
  useQuery: useQueryMock,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "p1" }),
}));

const today = localIsoDate();

function renderPage(tasks: unknown[] | undefined, { ccpmV2 = true } = {}) {
  useQueryMock.mockReturnValue(tasks);
  render(
    <DashboardContext.Provider
      value={{
        project: {
          id: "p1" as Id<"projects">,
          name: "Project",
          description: "",
          ccpmV2,
        },
        userRole: "member",
      }}
    >
      <MyTasks />
    </DashboardContext.Provider>,
  );
}

const card = (name: string) => screen.getByRole("region", { name });

beforeEach(() => {
  submitMock.mockResolvedValue(null);
});
afterEach(cleanup);

describe("My tasks", () => {
  it("groups in-progress and not-started tasks", () => {
    renderPage([
      {
        id: "a",
        label: "Write story",
        status: "in_progress",
        daysRemaining: 3,
      },
      { id: "b", label: "Wait for photos", status: "waiting" },
      { id: "c", label: "Launch", status: "todo", bestDays: 2 },
    ]);
    expect(screen.getByText("In progress")).toBeTruthy();
    expect(screen.getByText("2 to update")).toBeTruthy();
    expect(card("Write story")).toBeTruthy();
    expect(screen.getByText("Not started")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
  });

  it("saves days left in one tap", async () => {
    renderPage([
      {
        id: "a",
        label: "Write story",
        status: "in_progress",
        daysRemaining: 3,
      },
    ]);
    fireEvent.change(screen.getByLabelText("How many days are left?"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
    expect(submitMock).toHaveBeenCalledWith({
      taskId: "a",
      today,
      update: { kind: "progress", daysRemaining: 2 },
    });
  });

  it("starts a task with its best case as the default", async () => {
    renderPage([{ id: "c", label: "Launch", status: "todo", bestDays: 2 }]);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() =>
      expect(submitMock).toHaveBeenCalledWith({
        taskId: "c",
        today,
        update: { kind: "progress", daysRemaining: 2 },
      }),
    );
  });

  it("marks a task done on today's date by default", async () => {
    renderPage([{ id: "a", label: "Write story", status: "in_progress" }]);
    fireEvent.click(screen.getByRole("button", { name: "It's done" }));
    expect(
      screen.getByLabelText<HTMLInputElement>("When did you finish?").value,
    ).toBe(today);
    fireEvent.click(screen.getByRole("button", { name: "Mark done" }));
    await waitFor(() =>
      expect(submitMock).toHaveBeenCalledWith({
        taskId: "a",
        today,
        update: { kind: "done", finishDate: today },
      }),
    );
  });

  it("sets Waiting on someone, keeping the days left", async () => {
    renderPage([
      {
        id: "a",
        label: "Write story",
        status: "in_progress",
        daysRemaining: 3,
      },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Waiting on someone" }));
    await waitFor(() =>
      expect(submitMock).toHaveBeenCalledWith({
        taskId: "a",
        today,
        update: { kind: "waiting", daysRemaining: 3 },
      }),
    );
  });

  it("checks the number before saving", () => {
    renderPage([{ id: "a", label: "Write story", status: "in_progress" }]);
    fireEvent.change(screen.getByLabelText("How many days are left?"), {
      target: { value: "2-3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert").textContent).toBe(
      "Enter one number of days, like 5.",
    );
    expect(submitMock).not.toHaveBeenCalled();
  });

  it("shows the server's reason when a save is refused", async () => {
    submitMock.mockRejectedValue(
      new ConvexError("The finish date can't be in the future"),
    );
    renderPage([{ id: "a", label: "Write story", status: "in_progress" }]);
    fireEvent.click(screen.getByRole("button", { name: "It's done" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark done" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "The finish date can't be in the future",
    );
  });

  it("marks tasks updated this week", () => {
    renderPage([
      {
        id: "a",
        label: "Write story",
        status: "in_progress",
        lastUpdateDate: today,
      },
    ]);
    expect(screen.getByText("All updated this week")).toBeTruthy();
    expect(screen.getByText(/^Updated /)).toBeTruthy();
  });

  it("says when there's nothing to update", () => {
    renderPage([]);
    expect(
      screen.getByText("You don't own any open tasks in this project."),
    ).toBeTruthy();
  });

  it("warns that v1 projects don't use the updates", () => {
    renderPage([], { ccpmV2: false });
    expect(screen.getByText(/doesn't use Critical Chain v2 yet/)).toBeTruthy();
  });
});
