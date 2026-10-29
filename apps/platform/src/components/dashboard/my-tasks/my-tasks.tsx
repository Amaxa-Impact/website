"use client";

import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useDashboardContext } from "@/components/dashboard/context";
import { formatPlanDate, localIsoDate } from "@/lib/chain-view";
import { formatDays, parseDays } from "@/lib/estimates";
import { statusLabel } from "@/lib/task-status";
import { IconCircleCheck } from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";

import type { Id } from "@amaxa/backend/_generated/dataModel";
import { api } from "@amaxa/backend/_generated/api";
import { addDays } from "@amaxa/ccpm";
import { Button } from "@amaxa/ui/button";
import { Input } from "@amaxa/ui/input";
import { Label } from "@amaxa/ui/label";
import { Skeleton } from "@amaxa/ui/skeleton";

type MyTask = FunctionReturnType<typeof api.taskUpdates.listMine>[number];

const DAYS_PER_WEEK = 7;

function errorMessage(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === "string") {
    return error.data;
  }
  return "Couldn't save. Check your connection and try again.";
}

/** One task's update: days left, Done on a date, or Waiting on someone. */
function UpdateCard({ task, today }: { task: MyTask; today: string }) {
  const submit = useMutation(api.taskUpdates.submit);
  const notStarted = task.status === "todo";
  const [daysText, setDaysText] = useState(
    (notStarted ? task.bestDays : task.daysRemaining)?.toString() ?? "",
  );
  const [finishing, setFinishing] = useState(false);
  const [finishDate, setFinishDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updatedRecently =
    task.lastUpdateDate !== undefined &&
    task.lastUpdateDate > addDays(today, -DAYS_PER_WEEK);
  const headingId = `task-${task.id}`;
  const daysId = `days-${task.id}`;

  const send = async (
    update: Parameters<typeof submit>[0]["update"],
  ): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      await submit({ taskId: task.id as Id<"tasks">, today, update });
      setFinishing(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const days = () => {
    const parsed = parseDays(daysText);
    if (!parsed.ok) {
      setError(parsed.error);
      return null;
    }
    return parsed;
  };

  const saveDays = () => {
    const parsed = days();
    if (!parsed) return;
    if (parsed.value === undefined) {
      setError("Enter how many days are left, or mark it done.");
      return;
    }
    void send({ kind: "progress", daysRemaining: parsed.value });
  };

  const setWaiting = () => {
    const parsed = days();
    if (!parsed) return;
    void send(
      parsed.value === undefined
        ? { kind: "waiting" }
        : { kind: "waiting", daysRemaining: parsed.value },
    );
  };

  return (
    <section
      aria-labelledby={headingId}
      className="bg-card space-y-3 rounded-lg border p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="leading-tight font-semibold" id={headingId}>
            {task.label}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {statusLabel(task.status, true)}
            {task.actualStart &&
              ` · started ${formatPlanDate(task.actualStart, today)}`}
            {task.bestDays !== undefined &&
              ` · best case ${formatDays(task.bestDays)}`}
          </p>
        </div>
        {updatedRecently && task.lastUpdateDate && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <IconCircleCheck aria-hidden className="size-4" />
            Updated {formatPlanDate(task.lastUpdateDate, today)}
          </span>
        )}
      </div>

      {finishing ? (
        <div className="space-y-2">
          <Label htmlFor={`finish-${task.id}`}>When did you finish?</Label>
          <div className="flex gap-2">
            <Input
              className="h-11 flex-1"
              id={`finish-${task.id}`}
              max={today}
              min={task.actualStart}
              onChange={(e) => setFinishDate(e.target.value)}
              type="date"
              value={finishDate}
            />
            <Button
              className="h-11"
              disabled={saving || finishDate === ""}
              onClick={() => void send({ kind: "done", finishDate })}
              type="button"
            >
              Mark done
            </Button>
          </div>
          <Button
            className="h-9 px-0"
            onClick={() => {
              setFinishing(false);
              setError(null);
            }}
            type="button"
            variant="link"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor={daysId}>
              {notStarted
                ? "Starting now? How many days will it take?"
                : "How many days are left?"}
            </Label>
            <div className="flex gap-2">
              <Input
                className="h-11 flex-1"
                id={daysId}
                inputMode="decimal"
                onChange={(e) => setDaysText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveDays();
                }}
                placeholder="e.g. 3"
                value={daysText}
              />
              <Button
                className="h-11"
                disabled={saving}
                onClick={saveDays}
                type="button"
              >
                {notStarted ? "Start" : "Save"}
              </Button>
            </div>
            {task.status === "waiting" && (
              <p className="text-muted-foreground text-xs">
                Saving days left moves it back to In Progress.
              </p>
            )}
          </div>
          {!notStarted && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="h-11"
                disabled={saving}
                onClick={() => {
                  setFinishing(true);
                  setError(null);
                }}
                type="button"
                variant="outline"
              >
                It's done
              </Button>
              <Button
                className="h-11"
                disabled={saving || task.status === "waiting"}
                onClick={setWaiting}
                type="button"
                variant="outline"
              >
                Waiting on someone
              </Button>
            </div>
          )}
        </>
      )}

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

/** The weekly update: each open task the signed-in user owns, in one list. */
export function MyTasks() {
  const { projectId } = useParams<{ projectId: Id<"projects"> }>();
  const { project } = useDashboardContext();
  const tasks = useQuery(api.taskUpdates.listMine, { projectId });
  const [today] = useState(localIsoDate);

  const active = tasks?.filter((t) => t.status !== "todo") ?? [];
  const notStarted = tasks?.filter((t) => t.status === "todo") ?? [];
  const toUpdate = active.filter(
    (t) =>
      t.lastUpdateDate === undefined ||
      t.lastUpdateDate <= addDays(today, -DAYS_PER_WEEK),
  ).length;

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">My tasks</h1>
        <p className="text-muted-foreground text-sm">
          Your weekly update. For each task you&apos;re working on, say how many
          days are left, or mark it done.
        </p>
        {!project.ccpmV2 && (
          <p className="text-sm text-amber-600 dark:text-amber-500">
            This project doesn&apos;t use Critical Chain v2 yet, so updates here
            won&apos;t change the plan. Ask your coach to turn it on.
          </p>
        )}
      </header>

      {tasks === undefined ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          You don&apos;t own any open tasks in this project.
        </p>
      ) : (
        <>
          {active.length > 0 && (
            <section aria-labelledby="in-progress" className="space-y-3">
              <h2 className="text-sm font-semibold" id="in-progress">
                In progress
                <span className="text-muted-foreground ml-2 font-normal">
                  {toUpdate === 0
                    ? "All updated this week"
                    : `${toUpdate} to update`}
                </span>
              </h2>
              {active.map((task) => (
                <UpdateCard key={task.id} task={task} today={today} />
              ))}
            </section>
          )}
          {notStarted.length > 0 && (
            <section aria-labelledby="not-started" className="space-y-3">
              <h2 className="text-sm font-semibold" id="not-started">
                Not started
              </h2>
              {notStarted.map((task) => (
                <UpdateCard key={task.id} task={task} today={today} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
