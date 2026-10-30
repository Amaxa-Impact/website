import { describe, expect, it } from "vitest";

import { statusLabel, statusOptions } from "./task-status";

describe("task status labels", () => {
  it("keeps the v1 wording by default", () => {
    expect(statusLabel("completed")).toBe("Completed");
    expect(statusLabel("blocked")).toBe("Blocked");
  });

  it("uses Done / Unable to Complete / Waiting on someone on v2", () => {
    expect(statusLabel("completed", true)).toBe("Done");
    expect(statusLabel("blocked", true)).toBe("Unable to Complete");
    expect(statusLabel("waiting", true)).toBe("Waiting on someone");
  });

  it("only offers Waiting on v2 projects", () => {
    expect(statusOptions(false).map((o) => o.value)).toEqual([
      "todo",
      "in_progress",
      "completed",
      "blocked",
    ]);
    expect(statusOptions(true).map((o) => o.value)).toEqual([
      "todo",
      "in_progress",
      "waiting",
      "completed",
      "blocked",
    ]);
  });

  it("still labels a waiting task on a project that switched v2 off", () => {
    expect(statusLabel("waiting", false)).toBe("Waiting");
  });
});
