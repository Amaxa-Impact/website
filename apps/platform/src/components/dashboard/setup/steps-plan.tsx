"use client";

import { useState } from "react";
import { useDashboardContext } from "@/components/dashboard/context";
import { LAYOUT_GAP, wouldCreateLoop } from "@/lib/setup";
import { IconX } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";

import type { Id } from "@amaxa/backend/_generated/dataModel";
import { api } from "@amaxa/backend/_generated/api";
import { Button } from "@amaxa/ui/button";
import { Input } from "@amaxa/ui/input";
import { Label } from "@amaxa/ui/label";
import { Textarea } from "@amaxa/ui/textarea";

import type { SetupData } from "./use-setup-data";
import { StepFooter, StepTip } from "./step-chrome";

export interface StepProps {
  data: SetupData;
  onBack?: () => void;
  onNext: () => void;
}

export function errorText(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === "string") {
    return error.data;
  }
  return "Couldn't save. Check your connection and try again.";
}

/** Step 1: what the project will achieve, and when it runs. */
export function GoalStep({ data, onNext }: StepProps) {
  const { project } = useDashboardContext();
  const updateProject = useMutation(api.projects.update);
  const updateSettings = useMutation(api.projects.updateCcpmSettings);
  const [goal, setGoal] = useState(project.description);
  const [startDate, setStartDate] = useState(project.startDate ?? data.today);
  const [deadline, setDeadline] = useState(project.deadline ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (goal.trim() === "") {
      setError("Write the goal in a sentence.");
      return;
    }
    if (startDate === "" || deadline === "") {
      setError("Pick a start date and a deadline.");
      return;
    }
    if (deadline < startDate) {
      setError("The deadline can't be before the start date.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (goal !== project.description) {
        await updateProject({ projectId: data.projectId, description: goal });
      }
      await updateSettings({
        projectId: data.projectId,
        ccpmV2: true,
        startDate,
        deadline,
      });
      onNext();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <StepTip>
        Write the goal as the result you&apos;ll deliver, not the activity:
        &ldquo;Raise £2,000 for the shelter by March&rdquo;, not &ldquo;Run a
        fundraiser&rdquo;. The deadline is the date it has to be done by.
      </StepTip>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="setup-goal">Goal</Label>
          <Textarea
            id="setup-goal"
            onChange={(e) => setGoal(e.target.value)}
            placeholder="What will be true when the project is finished?"
            value={goal}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="setup-start">Start date</Label>
            <Input
              id="setup-start"
              onChange={(e) => setStartDate(e.target.value)}
              type="date"
              value={startDate}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-deadline">Deadline</Label>
            <Input
              id="setup-deadline"
              min={startDate}
              onChange={(e) => setDeadline(e.target.value)}
              type="date"
              value={deadline}
            />
          </div>
        </div>
        {!project.ccpmV2 && (
          <p className="text-muted-foreground text-xs">
            Saving this step turns on Critical Chain v2 for the project.
          </p>
        )}
      </div>
      <StepFooter
        busy={saving}
        error={error}
        nextLabel="Save and continue"
        onNext={() => void save()}
      />
    </>
  );
}

/** Step 2: the pieces of work, one line each. */
export function TasksStep({ data, onBack, onNext }: StepProps) {
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.updateData);
  const removeTask = useMutation(api.tasks.remove);
  const [newLabel, setNewLabel] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    const label = newLabel.trim();
    if (label === "") return;
    setError(null);
    try {
      // New tasks stack in the first column; "Arrange the chart" in the
      // review step lays them out once they're linked.
      await createTask({
        projectId: data.projectId,
        type: "task",
        position: { x: 0, y: data.tasks.length * LAYOUT_GAP.y },
        data: { label, status: "todo" },
      });
      setNewLabel("");
    } catch (e) {
      setError(errorText(e));
    }
  };

  const run = (action: Promise<unknown>) => {
    setError(null);
    action.catch((e: unknown) => setError(errorText(e)));
  };

  return (
    <>
      <StepTip>
        Work backwards from the goal. Each task is one piece of work that one
        person can own, roughly 1 to 15 days long. Don&apos;t worry about order
        yet.
      </StepTip>
      <ul className="space-y-2" aria-label="Tasks">
        {data.tasks.map((task) => (
          <li className="flex items-center gap-2" key={task.id}>
            <Input
              aria-label="Task name"
              defaultValue={task.label}
              onBlur={(e) => {
                const label = e.target.value.trim();
                if (label !== "" && label !== task.label) {
                  run(updateTask({ taskId: task.id, data: { label } }));
                }
              }}
            />
            {confirming === task.id ? (
              <Button
                onClick={() => {
                  setConfirming(null);
                  run(removeTask({ taskId: task.id }));
                }}
                type="button"
                variant="destructive"
              >
                Remove
              </Button>
            ) : (
              <Button
                aria-label={`Remove ${task.label}`}
                onClick={() => setConfirming(task.id)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <IconX className="size-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <Input
          aria-label="New task"
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={
            data.tasks.length === 0
              ? "e.g. Confirm story with partner"
              : "Next task"
          }
          value={newLabel}
        />
        <Button
          disabled={newLabel.trim() === ""}
          type="submit"
          variant="outline"
        >
          Add
        </Button>
      </form>
      <StepFooter
        error={error}
        nextDisabled={data.tasks.length === 0}
        onBack={onBack}
        onNext={onNext}
      />
    </>
  );
}

/** Step 3: what each task can't start without. */
export function LinksStep({ data, onBack, onNext }: StepProps) {
  const createEdge = useMutation(api.edges.create);
  const removeEdge = useMutation(api.edges.remove);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (from: string, to: string) => {
    setError(null);
    const existing = data.edges.find(
      (e) => e.source === from && e.target === to,
    );
    try {
      if (existing) {
        await removeEdge({ edgeId: existing.id });
      } else {
        await createEdge({
          projectId: data.projectId,
          source: from as Id<"tasks">,
          target: to as Id<"tasks">,
          type: "smoothstep",
        });
      }
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <>
      <StepTip>
        For each task, pick only what it truly can&apos;t start without. Work
        that can happen at the same time shouldn&apos;t be linked: that&apos;s
        how the plan finds what can run in parallel.
      </StepTip>
      {data.tasks.length < 2 ? (
        <p className="text-muted-foreground text-sm">
          Add at least two tasks to link them.
        </p>
      ) : (
        <ul className="space-y-4">
          {data.tasks.map((task) => (
            <li className="space-y-2" key={task.id}>
              <p className="text-sm font-medium">{task.label}</p>
              <div
                aria-label={`What ${task.label} needs first`}
                className="flex flex-wrap gap-2"
                role="group"
              >
                {data.tasks
                  .filter((other) => other.id !== task.id)
                  .map((other) => {
                    const linked = data.edges.some(
                      (e) => e.source === other.id && e.target === task.id,
                    );
                    const loops =
                      !linked && wouldCreateLoop(data.edges, other.id, task.id);
                    return (
                      <Button
                        aria-pressed={linked}
                        className="h-8 rounded-full text-xs"
                        disabled={loops}
                        key={other.id}
                        onClick={() => void toggle(other.id, task.id)}
                        size="sm"
                        title={
                          loops
                            ? `“${other.label}” already depends on this task`
                            : undefined
                        }
                        type="button"
                        variant={linked ? "default" : "outline"}
                      >
                        {other.label}
                      </Button>
                    );
                  })}
              </div>
            </li>
          ))}
        </ul>
      )}
      <StepFooter error={error} onBack={onBack} onNext={onNext} />
    </>
  );
}
