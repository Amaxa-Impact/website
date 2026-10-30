import type * as XyFlow from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { DashboardContext } from "@/components/dashboard/context";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Id } from "@amaxa/backend/_generated/dataModel";

import type { TaskNodeData } from "./TaskNode";
import { TaskNode } from "./TaskNode";

vi.mock("@xyflow/react", async (importOriginal) => ({
  ...(await importOriginal<typeof XyFlow>()),
  // Handles need a node renderer context; they aren't under test here.
  Handle: () => null,
}));

const TIP_KEY = "ccpm:estimate-tip-seen";

function renderNode(
  data: Partial<TaskNodeData>,
  { ccpmV2 = true, safeRatio }: { ccpmV2?: boolean; safeRatio?: number } = {},
) {
  const onDataChange = vi.fn<NonNullable<TaskNodeData["onDataChange"]>>();
  const props = {
    id: "t1",
    data: { label: "Write story", onDataChange, ...data },
  } as unknown as NodeProps;

  render(
    <DashboardContext.Provider
      value={{
        project: {
          id: "p1" as Id<"projects">,
          name: "Project",
          description: "",
          ccpmV2,
          ...(safeRatio === undefined ? {} : { safeRatio }),
        },
        userRole: "coach",
      }}
    >
      <TaskNode {...props} />
    </DashboardContext.Provider>,
  );
  return { onDataChange };
}

const openEditor = () => fireEvent.click(screen.getByLabelText("Edit task"));
const bestInput = () => screen.getByLabelText("Best case, how many days?");
const safeInput = () =>
  screen.getByLabelText("If you had to be sure, how many days?");
const type = (input: HTMLElement, value: string) =>
  fireEvent.change(input, { target: { value } });
const save = () => fireEvent.click(screen.getByLabelText("Save task"));

// The form submits asynchronously, so a "was not saved" assertion must give a
// real submit time to fire or it passes vacuously.
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("TaskNode on a v1 project", () => {
  it("keeps the existing editor: priority, no estimate questions", () => {
    renderNode({ priority: "high" }, { ccpmV2: false });
    expect(screen.getByText("HIGH")).toBeTruthy();

    openEditor();
    expect(screen.queryByText("Best case, how many days?")).toBeNull();
    expect(screen.getByText("Priority")).toBeTruthy();
    expect(screen.getByText("Assigned To")).toBeTruthy();
    expect(screen.getByText("High")).toBeTruthy();
  });

  it("ignores chain data on a v1 project", () => {
    renderNode(
      { chain: { onChain: true, overlapsWith: ["Other"] } },
      { ccpmV2: false },
    );
    expect(screen.queryByText("Critical chain")).toBeNull();
    expect(screen.queryByText(/Same owner/)).toBeNull();
  });

  it("shows the v1 status label", () => {
    renderNode({}, { ccpmV2: false });
    expect(screen.getByText("To Do")).toBeTruthy();
  });

  it("saves priority as before", async () => {
    const { onDataChange } = renderNode({ priority: "low" }, { ccpmV2: false });
    openEditor();
    save();
    await waitFor(() => expect(onDataChange).toHaveBeenCalledTimes(1));
    expect(onDataChange).toHaveBeenCalledWith(
      {
        label: "Write story",
        description: "",
        assignedTo: "",
        priority: "low",
      },
      undefined,
    );
  });
});

describe("TaskNode view on a v2 project", () => {
  it("prompts for an estimate and an owner when both are missing", () => {
    renderNode({});
    expect(screen.getByText(/No estimate yet/)).toBeTruthy();
    expect(screen.getByText("No owner yet.")).toBeTruthy();
    expect(screen.queryByText("MEDIUM")).toBeNull();
  });

  it("marks a critical chain task", () => {
    renderNode({ chain: { onChain: true, overlapsWith: [] } });
    expect(screen.getByText("Critical chain")).toBeTruthy();
  });

  it("warns when the owner is on another task at the same time", () => {
    renderNode({
      assignedTo: "u1",
      chain: { onChain: false, overlapsWith: ["Take photos"] },
    });
    expect(screen.queryByText("Critical chain")).toBeNull();
    expect(
      screen.getByText(/Same owner is on “Take photos” at the same time/),
    ).toBeTruthy();
  });

  it("shows the status label, not the stored value", () => {
    renderNode({ status: "waiting" });
    expect(screen.getByText("Waiting on someone")).toBeTruthy();
    expect(screen.queryByText("waiting")).toBeNull();
  });

  it("shows both numbers", () => {
    renderNode({ bestDays: 5, safeDays: 10, assignedTo: "u1" });
    expect(screen.getByText("Best 5 days · Safe 10 days")).toBeTruthy();
    expect(screen.getByText(/Owner:/)).toBeTruthy();
  });

  it("shows the default safe estimate from the project's ratio", () => {
    renderNode({ bestDays: 4 }, { safeRatio: 2 });
    expect(
      screen.getByText("Best 4 days · Safe 8 days (default)"),
    ).toBeTruthy();
  });
});

describe("TaskNode editor on a v2 project", () => {
  it("asks the two questions and an owner, with no priority", () => {
    renderNode({});
    openEditor();
    expect(bestInput()).toBeTruthy();
    expect(safeInput()).toBeTruthy();
    expect(screen.getByText("Owner")).toBeTruthy();
    expect(screen.queryByText("Priority")).toBeNull();
  });

  it("opens from a double-click on the title", () => {
    renderNode({});
    fireEvent.doubleClick(screen.getByText("Write story"));
    expect(bestInput()).toBeTruthy();
  });

  it("saves best only, leaving safe to default", async () => {
    const { onDataChange } = renderNode({});
    openEditor();
    type(bestInput(), "5");
    save();

    await waitFor(() => expect(onDataChange).toHaveBeenCalledTimes(1));
    const [changes, clear] = onDataChange.mock.calls[0] ?? [];
    expect(changes).toEqual({
      label: "Write story",
      description: "",
      assignedTo: "",
      bestDays: 5,
    });
    expect(clear).toBeUndefined();
  });

  it("saves both numbers", async () => {
    const { onDataChange } = renderNode({});
    openEditor();
    type(bestInput(), "4");
    type(safeInput(), "7");
    save();

    await waitFor(() => expect(onDataChange).toHaveBeenCalledTimes(1));
    expect(onDataChange.mock.calls[0]?.[0]).toMatchObject({
      bestDays: 4,
      safeDays: 7,
    });
  });

  it("shows the default safe number as a hint once best is typed", () => {
    renderNode({}, { safeRatio: 1.5 });
    openEditor();
    type(bestInput(), "4");
    expect(
      screen.getByPlaceholderText("Optional (blank = 6 days)"),
    ).toBeTruthy();
  });

  it("clears a safe estimate the user blanks out", async () => {
    const { onDataChange } = renderNode({ bestDays: 4, safeDays: 7 });
    openEditor();
    type(safeInput(), "");
    save();

    await waitFor(() => expect(onDataChange).toHaveBeenCalledTimes(1));
    const [changes, clear] = onDataChange.mock.calls[0] ?? [];
    expect(changes).toMatchObject({ bestDays: 4 });
    expect(changes).not.toHaveProperty("safeDays");
    expect(clear).toEqual(["safeDays"]);
  });

  it("rejects ranges: one number only", async () => {
    const { onDataChange } = renderNode({});
    openEditor();
    type(bestInput(), "3-5");
    save();

    expect(screen.getByText("Enter one number of days, like 5.")).toBeTruthy();
    await settle();
    expect(onDataChange).not.toHaveBeenCalled();
  });

  it("rejects a safe number below the best case", async () => {
    const { onDataChange } = renderNode({});
    openEditor();
    type(bestInput(), "5");
    type(safeInput(), "3");
    save();

    expect(screen.getByText(/can't be less than your best case/)).toBeTruthy();
    await settle();
    expect(onDataChange).not.toHaveBeenCalled();
  });

  it("asks for the best case when only safe is filled in", async () => {
    const { onDataChange } = renderNode({});
    openEditor();
    type(safeInput(), "6");
    save();

    expect(screen.getByText("Add your best case too.")).toBeTruthy();
    await settle();
    expect(onDataChange).not.toHaveBeenCalled();
  });

  it("lets a task be saved with no estimate yet", async () => {
    const { onDataChange } = renderNode({});
    openEditor();
    save();
    await waitFor(() => expect(onDataChange).toHaveBeenCalledTimes(1));
    expect(onDataChange.mock.calls[0]?.[0]).not.toHaveProperty("bestDays");
  });
});

describe("the 'why two numbers' tip", () => {
  it("shows the first time and goes away once dismissed", async () => {
    renderNode({});
    openEditor();
    expect(await screen.findByText("Why two numbers?")).toBeTruthy();

    fireEvent.click(screen.getByText("Got it"));
    expect(screen.queryByText("Why two numbers?")).toBeNull();
    expect(window.localStorage.getItem(TIP_KEY)).toBe("1");

    cleanup();
    renderNode({});
    openEditor();
    expect(screen.queryByText("Why two numbers?")).toBeNull();
  });

  it("is retired by saving a first estimate", async () => {
    const { onDataChange } = renderNode({});
    openEditor();
    await screen.findByText("Why two numbers?");
    type(bestInput(), "3");
    save();
    await waitFor(() => expect(onDataChange).toHaveBeenCalled());
    expect(window.localStorage.getItem(TIP_KEY)).toBe("1");
  });

  it("stays hidden when it was already seen", () => {
    window.localStorage.setItem(TIP_KEY, "1");
    renderNode({});
    openEditor();
    expect(screen.queryByText("Why two numbers?")).toBeNull();
  });
});
