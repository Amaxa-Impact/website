/** biome-ignore-all lint/correctness/noChildrenProp: This is a workaround to fix the linting error. */
"use client";

import type { TaskStatus } from "@/lib/task-status";
import type { NodeProps } from "@xyflow/react";
import { memo, useCallback, useRef, useState } from "react";
import { useDashboardContext } from "@/components/dashboard/context";
import {
  checkEstimates,
  DEFAULT_SAFE_RATIO,
  defaultSafeDays,
  formatDays,
} from "@/lib/estimates";
import { statusOptions } from "@/lib/task-status";
import {
  IconAlertTriangle,
  IconCheck,
  IconPencil,
  IconX,
} from "@tabler/icons-react";
import { useForm, useStore } from "@tanstack/react-form";
import { Handle, Position } from "@xyflow/react";

import { Button } from "@amaxa/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@amaxa/ui/field";
import { Input } from "@amaxa/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@amaxa/ui/select";
import { Textarea } from "@amaxa/ui/textarea";

import { EstimateTip, markEstimateTipSeen } from "./estimate-tip";

export type ClearableTaskField = "bestDays" | "safeDays";

export interface TaskNodeData {
  label: string;
  description?: string;
  status?: TaskStatus;
  assignedTo?: string;
  dueDate?: number;
  priority?: "low" | "medium" | "high";
  bestDays?: number;
  safeDays?: number;
  /** Set on v2 projects once the critical chain can be worked out. */
  chain?: { onChain: boolean; overlapsWith: string[] };
  onStatusChange?: (status: TaskNodeData["status"]) => void;
  onDataChange?: (
    data: Partial<TaskNodeData>,
    clear?: ClearableTaskField[],
  ) => void;
  onQuickAddTask?: () => void;
  projectMembers?: { userId: string; name?: string }[];
}

const statusColors = {
  todo: "bg-card border-border",
  in_progress: "bg-info-soft border-info-border",
  completed: "bg-success-soft border-success-border",
  blocked: "bg-danger-soft border-danger-border",
  waiting: "bg-warning-soft border-warning-border",
};

const priorityColors = {
  low: "text-muted-foreground",
  medium: "text-warning",
  high: "text-danger",
};

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export const TaskNode = memo(({ data, id }: NodeProps) => {
  const taskData = data as unknown as TaskNodeData;
  const { project } = useDashboardContext();
  const ccpmV2 = project.ccpmV2 ?? false;
  const [isEditing, setIsEditing] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);

  const status = taskData.status ?? "todo";
  const priority = taskData.priority ?? "medium";
  const statuses = statusOptions(ccpmV2);
  const onChain = ccpmV2 && (taskData.chain?.onChain ?? false);
  const overlapsWith = ccpmV2 ? (taskData.chain?.overlapsWith ?? []) : [];

  const form = useForm({
    defaultValues: {
      label: taskData.label,
      description: taskData.description ?? "",
      assignedTo: taskData.assignedTo ?? "",
      priority: taskData.priority ?? "medium",
      bestDays: taskData.bestDays?.toString() ?? "",
      safeDays: taskData.safeDays?.toString() ?? "",
    },
    onSubmit: ({ value }) => {
      if (taskData.onDataChange) {
        const changes: Partial<TaskNodeData> = {
          label: value.label,
          description: value.description,
          assignedTo: value.assignedTo,
        };
        const clear: ClearableTaskField[] = [];

        if (ccpmV2) {
          // Priority is computed on v2 projects, so the editor leaves it alone.
          const estimates = checkEstimates(value.bestDays, value.safeDays);
          if (estimates.best !== undefined) {
            changes.bestDays = estimates.best;
          } else if (taskData.bestDays !== undefined) {
            clear.push("bestDays");
          }
          if (estimates.safe !== undefined) {
            changes.safeDays = estimates.safe;
          } else if (taskData.safeDays !== undefined) {
            clear.push("safeDays");
          }
          if (estimates.best !== undefined) {
            markEstimateTipSeen();
          }
        } else {
          changes.priority = value.priority;
        }

        taskData.onDataChange(changes, clear.length > 0 ? clear : undefined);
      }
      setIsEditing(false);
    },
  });

  const formValues = useStore(form.store, (state) => state.values);
  const estimateCheck = checkEstimates(
    formValues.bestDays,
    formValues.safeDays,
  );
  const safeRatio = project.safeRatio ?? DEFAULT_SAFE_RATIO;

  const handleStatusChange = useCallback(
    (newStatus: string | null) => {
      if (newStatus && taskData.onStatusChange) {
        taskData.onStatusChange(newStatus as TaskNodeData["status"]);
      }
    },
    [taskData],
  );

  const handleEditClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      form.setFieldValue("label", taskData.label);
      form.setFieldValue("description", taskData.description ?? "");
      form.setFieldValue("assignedTo", taskData.assignedTo ?? "");
      form.setFieldValue("priority", taskData.priority ?? "medium");
      form.setFieldValue("bestDays", taskData.bestDays?.toString() ?? "");
      form.setFieldValue("safeDays", taskData.safeDays?.toString() ?? "");
      setSubmitAttempted(false);
      setIsEditing(true);
      requestAnimationFrame(() => {
        labelInputRef.current?.focus();
      });
    },
    [form, taskData],
  );

  const handleSave = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (ccpmV2 && !estimateCheck.valid) {
        setSubmitAttempted(true);
        return;
      }
      void form.handleSubmit();
    },
    [ccpmV2, estimateCheck.valid, form],
  );

  const handleCancel = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditing(false);
      void form.reset();
    },
    [form],
  );

  const handleQuickAddTask = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      taskData.onQuickAddTask?.();
    },
    [taskData],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsEditing(false);
    }
  }, []);

  if (isEditing) {
    return (
      <div className="nodrag nopan bg-card text-card-foreground min-w-70 rounded-lg border-2 px-3 py-3 shadow-md">
        <Handle className="h-3 w-3" position={Position.Left} type="target" />

        <form onKeyDown={handleKeyDown}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                Edit Task
              </span>
              <div className="flex gap-1">
                <Button
                  className="h-6 w-6 p-0"
                  aria-label="Save task"
                  onClick={handleSave}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <IconCheck className="text-success h-3.5 w-3.5" />
                </Button>
                <Button
                  className="h-6 w-6 p-0"
                  aria-label="Cancel editing"
                  onClick={handleCancel}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <IconX className="text-danger h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <FieldGroup>
              <form.Field name="label">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={`task-${id}-label`}>
                      Task Name
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id={`task-${id}-label`}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Task name"
                        ref={labelInputRef}
                        value={field.state.value}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </FieldContent>
                  </Field>
                )}
              </form.Field>

              <form.Field name="description">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={`task-${id}-description`}>
                      Description
                    </FieldLabel>
                    <FieldContent>
                      <Textarea
                        className="min-h-15"
                        id={`task-${id}-description`}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Description (optional)"
                        value={field.state.value}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </FieldContent>
                  </Field>
                )}
              </form.Field>

              {ccpmV2 && (
                <div className="flex flex-col gap-2">
                  <EstimateTip />
                  <form.Field name="bestDays">
                    {(field) => {
                      const showError =
                        submitAttempted ||
                        field.state.value !== "" ||
                        formValues.safeDays !== "";
                      return (
                        <Field>
                          <FieldLabel htmlFor={`task-${id}-best`}>
                            Best case, how many days?
                          </FieldLabel>
                          <FieldContent>
                            <Input
                              id={`task-${id}-best`}
                              inputMode="decimal"
                              name={field.name}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                              placeholder="e.g. 5"
                              value={field.state.value}
                            />
                            <FieldError
                              errors={
                                showError && estimateCheck.bestError
                                  ? [{ message: estimateCheck.bestError }]
                                  : undefined
                              }
                            />
                          </FieldContent>
                        </Field>
                      );
                    }}
                  </form.Field>
                  <form.Field name="safeDays">
                    {(field) => {
                      const showError =
                        submitAttempted || field.state.value !== "";
                      const fallback =
                        estimateCheck.best === undefined
                          ? undefined
                          : defaultSafeDays(estimateCheck.best, safeRatio);
                      return (
                        <Field>
                          <FieldLabel htmlFor={`task-${id}-safe`}>
                            If you had to be sure, how many days?
                          </FieldLabel>
                          <FieldContent>
                            <Input
                              id={`task-${id}-safe`}
                              inputMode="decimal"
                              name={field.name}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                              placeholder={
                                fallback === undefined
                                  ? "Optional"
                                  : `Optional (blank = ${formatDays(fallback)})`
                              }
                              value={field.state.value}
                            />
                            <FieldError
                              errors={
                                showError && estimateCheck.safeError
                                  ? [{ message: estimateCheck.safeError }]
                                  : undefined
                              }
                            />
                          </FieldContent>
                        </Field>
                      );
                    }}
                  </form.Field>
                </div>
              )}

              <div className="nodrag nopan flex gap-2">
                {!ccpmV2 && (
                  <form.Field name="priority">
                    {(field) => (
                      <Field className="flex-1">
                        <FieldLabel htmlFor={`task-${id}-priority`}>
                          Priority
                        </FieldLabel>
                        <FieldContent>
                          <Select
                            items={priorityOptions}
                            onValueChange={(value) => {
                              if (value != null) {
                                field.handleChange(value);
                              }
                            }}
                            value={field.state.value}
                          >
                            <SelectTrigger
                              className="w-full"
                              id={`task-${id}-priority`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {priorityOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FieldError errors={field.state.meta.errors} />
                        </FieldContent>
                      </Field>
                    )}
                  </form.Field>
                )}

                <form.Field name="assignedTo">
                  {(field) => {
                    const selectedMember = taskData.projectMembers?.find(
                      (m) => m.userId === field.state.value,
                    );
                    const displayName = field.state.value
                      ? (selectedMember?.name ?? field.state.value)
                      : ccpmV2
                        ? "No owner yet"
                        : "Unassigned";

                    return (
                      <Field className="flex-1">
                        <FieldLabel htmlFor={`task-${id}-assignedTo`}>
                          {ccpmV2 ? "Owner" : "Assigned To"}
                        </FieldLabel>
                        <FieldContent>
                          <Select
                            onValueChange={(value) =>
                              field.handleChange(value ?? "")
                            }
                            value={field.state.value}
                          >
                            <SelectTrigger
                              className="w-full"
                              id={`task-${id}-assignedTo`}
                            >
                              <SelectValue>{displayName}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">
                                {ccpmV2 ? "No owner yet" : "Unassigned"}
                              </SelectItem>
                              {taskData.projectMembers?.map((member) => (
                                <SelectItem
                                  key={member.userId}
                                  value={member.userId}
                                >
                                  {member.name ?? member.userId}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FieldError errors={field.state.meta.errors} />
                        </FieldContent>
                      </Field>
                    );
                  }}
                </form.Field>
              </div>
            </FieldGroup>
          </div>
        </form>

        <Handle className="h-3 w-3" position={Position.Right} type="source" />
      </div>
    );
  }

  return (
    <div
      className={`text-foreground min-w-50 rounded-lg border-2 px-3 py-2.5 shadow-md ${statusColors[status]} ${
        onChain
          ? "ring-primary ring-offset-background ring-2 ring-offset-2"
          : ""
      }`}
    >
      <Handle className="h-3 w-3" position={Position.Left} type="target" />

      <div className="flex flex-col gap-2">
        {onChain && (
          <p className="text-primary text-[10px] font-semibold tracking-wide uppercase">
            Critical chain
          </p>
        )}
        <div className="flex items-start justify-between gap-2">
          <h3
            className="flex-1 cursor-text text-sm leading-tight font-semibold"
            onDoubleClick={handleEditClick}
            title="Double-click to edit"
          >
            {taskData.label}
          </h3>
          <div className="flex items-center gap-1">
            {!ccpmV2 && (
              <span
                className={`text-xs font-medium ${priorityColors[priority]}`}
              >
                {priority.toUpperCase()}
              </span>
            )}
            <Button
              className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
              aria-label="Edit task"
              onClick={handleEditClick}
              size="sm"
              variant="ghost"
            >
              <IconPencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {taskData.description && (
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {taskData.description}
          </p>
        )}

        {ccpmV2 &&
          (taskData.bestDays === undefined ? (
            <p className="text-warning text-xs">
              No estimate yet. Double-click to add one.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Best {formatDays(taskData.bestDays)} · Safe{" "}
              {taskData.safeDays === undefined
                ? `${formatDays(defaultSafeDays(taskData.bestDays, safeRatio))} (default)`
                : formatDays(taskData.safeDays)}
            </p>
          ))}

        <div className="nodrag nopan flex items-center gap-2">
          <Select
            items={statuses}
            onValueChange={handleStatusChange}
            value={status}
          >
            <SelectTrigger className="h-6 w-full text-xs" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {taskData.assignedTo ? (
          <div className="text-muted-foreground text-xs">
            {ccpmV2 ? "Owner" : "Assigned to"}:{" "}
            {taskData.projectMembers?.find(
              (m) => m.userId === taskData.assignedTo,
            )?.name ?? taskData.assignedTo}
          </div>
        ) : (
          ccpmV2 && <p className="text-warning text-xs">No owner yet.</p>
        )}

        {overlapsWith.length > 0 && (
          // w-0 + min-w-full: wrap to the card's width instead of widening it.
          <p className="text-warning flex w-0 min-w-full gap-1 text-xs">
            <IconAlertTriangle
              aria-hidden
              className="mt-px size-3.5 shrink-0"
            />
            <span>
              Same owner is on{" "}
              {overlapsWith.map((name) => `“${name}”`).join(", ")} at the same
              time.
            </span>
          </p>
        )}
      </div>

      <Handle
        className="h-3 w-3 cursor-copy"
        onClick={handleQuickAddTask}
        position={Position.Right}
        title="Click to create a connected task"
        type="source"
      />
    </div>
  );
});

TaskNode.displayName = "TaskNode";
