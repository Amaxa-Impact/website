"use client";

import type { ClearableTaskField } from "@/components/dashboard/sidebar/TaskNode";
import { useState } from "react";
import { useDashboardContext } from "@/components/dashboard/context";
import {
  checkEstimates,
  DEFAULT_SAFE_RATIO,
  defaultSafeDays,
  formatDays,
} from "@/lib/estimates";
import { useMutation } from "convex/react";

import { api } from "@amaxa/backend/_generated/api";
import { Input } from "@amaxa/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@amaxa/ui/select";

import type { StepProps } from "./steps-plan";
import type { SetupTaskRow } from "./use-setup-data";
import { StepFooter, StepTip } from "./step-chrome";
import { errorText } from "./steps-plan";

/** Step 4: one owner per task. */
export function OwnersStep({ data, onBack, onNext }: StepProps) {
  const updateTask = useMutation(api.tasks.updateData);
  const [error, setError] = useState<string | null>(null);
  const items = [
    { value: "", label: "No owner yet" },
    ...data.members.map((m) => ({ value: m.userId, label: m.name })),
  ];

  return (
    <>
      <StepTip>
        Give every task exactly one owner, even if others help. Spread the work
        out: the critical chain moves only as fast as the busiest person on it.
      </StepTip>
      <ul className="space-y-3">
        {data.tasks.map((task) => (
          <li
            className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            key={task.id}
          >
            <span className="text-sm font-medium" id={`owner-label-${task.id}`}>
              {task.label}
            </span>
            <Select
              items={items}
              onValueChange={(value) => {
                setError(null);
                updateTask({
                  taskId: task.id,
                  data: { assignedTo: value ?? "" },
                }).catch((e: unknown) => setError(errorText(e)));
              }}
              value={task.assignedTo ?? ""}
            >
              <SelectTrigger
                aria-labelledby={`owner-label-${task.id}`}
                className="w-full sm:w-60"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </li>
        ))}
      </ul>
      {data.members.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nobody has joined this project yet. Add people from the Users page.
        </p>
      )}
      <StepFooter error={error} onBack={onBack} onNext={onNext} />
    </>
  );
}

function EstimateRow({
  task,
  safeRatio,
}: {
  task: SetupTaskRow;
  safeRatio: number;
}) {
  const updateTask = useMutation(api.tasks.updateData);
  const [best, setBest] = useState(task.bestDays?.toString() ?? "");
  const [safe, setSafe] = useState(task.safeDays?.toString() ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);
  const check = checkEstimates(best, safe);

  // Saves when a field loses focus, if both answers make sense together.
  const save = () => {
    if (!check.valid) return;
    if (check.best === task.bestDays && check.safe === task.safeDays) return;
    const clear: ClearableTaskField[] = [];
    if (check.best === undefined && task.bestDays !== undefined) {
      clear.push("bestDays");
    }
    if (check.safe === undefined && task.safeDays !== undefined) {
      clear.push("safeDays");
    }
    setSaveError(null);
    updateTask({
      taskId: task.id,
      data: {
        ...(check.best === undefined ? {} : { bestDays: check.best }),
        ...(check.safe === undefined ? {} : { safeDays: check.safe }),
      },
      ...(clear.length > 0 ? { clear } : {}),
    }).catch((e: unknown) => setSaveError(errorText(e)));
  };

  const fallback =
    check.best === undefined
      ? undefined
      : defaultSafeDays(check.best, safeRatio);
  const problem =
    saveError ??
    (best !== "" || safe !== ""
      ? (check.bestError ?? check.safeError)
      : undefined);

  return (
    <li className="space-y-1.5">
      <p className="text-sm font-medium">{task.label}</p>
      <div className="grid grid-cols-2 gap-2">
        <Input
          aria-label={`${task.label}: best case, how many days?`}
          inputMode="decimal"
          onBlur={save}
          onChange={(e) => setBest(e.target.value)}
          placeholder="Best case"
          value={best}
        />
        <Input
          aria-label={`${task.label}: if you had to be sure, how many days?`}
          inputMode="decimal"
          onBlur={save}
          onChange={(e) => setSafe(e.target.value)}
          placeholder={
            fallback === undefined
              ? "To be sure"
              : `Sure: ${formatDays(fallback)}`
          }
          value={safe}
        />
      </div>
      {problem && (
        <p className="text-destructive text-xs" role="alert">
          {problem}
        </p>
      )}
    </li>
  );
}

/** Step 5: two numbers per task. */
export function EstimatesStep({ data, onBack, onNext }: StepProps) {
  const { project } = useDashboardContext();
  const safeRatio = project.safeRatio ?? DEFAULT_SAFE_RATIO;
  const missing = data.tasks.filter((t) => t.bestDays === undefined).length;

  return (
    <>
      <StepTip>
        Ask each owner for two numbers. The best case is how long it takes if
        things go well, a fair 50/50 guess. The second is how long they&apos;d
        need to be sure. The gap goes into one shared buffer, so nobody pads
        their own task. Leave the second blank to use {safeRatio}× the best
        case.
      </StepTip>
      <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
        <span>Best case, how many days?</span>
        <span>If you had to be sure?</span>
      </div>
      <ul className="space-y-4">
        {data.tasks.map((task) => (
          <EstimateRow key={task.id} safeRatio={safeRatio} task={task} />
        ))}
      </ul>
      <p className="text-muted-foreground text-sm">
        {missing === 0
          ? "Every task has an estimate."
          : `${missing} ${missing === 1 ? "task still needs" : "tasks still need"} a best case.`}
      </p>
      <StepFooter onBack={onBack} onNext={onNext} />
    </>
  );
}
