"use client";

import type { SetupStepKey } from "@/lib/setup";
import { useState } from "react";
import Link from "next/link";
import { useDashboardContext } from "@/components/dashboard/context";
import { formatPlanDate } from "@/lib/chain-view";
import { formatDays } from "@/lib/estimates";
import { layeredLayout } from "@/lib/setup";
import { IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react";
import { useMutation } from "convex/react";

import { api } from "@amaxa/backend/_generated/api";
import { Button } from "@amaxa/ui/button";

import type { StepProps } from "./steps-plan";
import { StepFooter, StepTip } from "./step-chrome";
import { errorText } from "./steps-plan";

interface ReviewProps extends StepProps {
  goTo: (step: SetupStepKey) => void;
  chartHref: string;
}

/** What stops the chain being worked out, and the step that fixes it. */
function Blocked({ data, goTo }: Pick<ReviewProps, "data" | "goTo">) {
  const view = data.chainView;
  let message: string;
  let step: SetupStepKey;
  let action: string;
  if (view === null || view.status === "empty") {
    message = "There are no tasks yet.";
    step = "tasks";
    action = "List the tasks";
  } else if (view.status === "needs_estimates") {
    message = `${view.taskIds.length} ${view.taskIds.length === 1 ? "task needs" : "tasks need"} a best-case estimate: ${view.taskIds.map(data.nameOf).join(", ")}.`;
    step = "estimates";
    action = "Add estimates";
  } else if (view.status === "cycle") {
    message = view.message;
    step = "links";
    action = "Fix the links";
  } else if (view.status === "error") {
    message = view.message;
    step = "goal";
    action = "Check the dates";
  } else {
    return null;
  }
  return (
    <div className="space-y-2 rounded-md border border-amber-500/50 p-3 text-sm">
      <p>{message}</p>
      <Button
        onClick={() => goTo(step)}
        size="sm"
        type="button"
        variant="outline"
      >
        {action}
      </Button>
    </div>
  );
}

/** Step 6: the critical chain, its buffers and any owner overlaps. */
export function ReviewStep({
  data,
  onBack,
  onNext,
  goTo,
  chartHref,
}: ReviewProps) {
  const arrange = useMutation(api.tasks.batchUpdatePositions);
  const [arranged, setArranged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const view = data.chainView;

  const arrangeChart = async () => {
    setError(null);
    const positions = layeredLayout(
      data.tasks.map((t) => t.id),
      data.edges,
    );
    try {
      await arrange({
        updates: data.tasks.flatMap((t) => {
          const position = positions.get(t.id);
          return position ? [{ taskId: t.id, position }] : [];
        }),
      });
      setArranged(true);
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <>
      <StepTip>
        The critical chain is the longest line of linked work: a day late on it
        is a day late for the whole project. The buffers are shared safety time.
        Protect them, rather than padding each task.
      </StepTip>
      {view?.status !== "ready" ? (
        <Blocked data={data} goTo={goTo} />
      ) : (
        <div className="space-y-5 text-sm">
          <section className="space-y-2" aria-labelledby="review-chain">
            <h3 className="font-semibold" id="review-chain">
              Critical chain: {formatDays(view.chainDays)}
            </h3>
            <ol className="list-decimal space-y-1 pl-5">
              {view.chain.map((id) => {
                const task = data.tasks.find((t) => t.id === id);
                const owner = data.ownerName(task?.assignedTo);
                return (
                  <li key={id}>
                    {data.nameOf(id)}
                    <span className="text-muted-foreground">
                      {owner ? ` · ${owner}` : " · no owner yet"}
                      {task?.bestDays !== undefined &&
                        ` · ${formatDays(task.bestDays)}`}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p>
              <span className="font-medium">Project buffer:</span>{" "}
              {formatDays(view.projectBufferDays)}, after the last chain task.
            </p>
          </section>

          {view.feedingBuffers.length > 0 && (
            <section className="space-y-2" aria-labelledby="review-feeding">
              <h3 className="font-semibold" id="review-feeding">
                Side chains
              </h3>
              <ul className="space-y-2">
                {view.feedingBuffers.map((fb) => (
                  <li key={fb.id}>
                    {fb.taskIds.map(data.nameOf).join(" → ")}, into &ldquo;
                    {data.nameOf(fb.mergeTaskId)}&rdquo;
                    <span className="text-muted-foreground block">
                      Feeding buffer {formatDays(fb.sizeDays)} ·{" "}
                      {fb.startNow
                        ? "start this chain now"
                        : view.datesKnown
                          ? `start by ${formatPlanDate(fb.latestStartDate, data.today)}`
                          : "set a start date to see when it must start"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {view.overlaps.size > 0 && (
            <section
              className="space-y-1 text-amber-600 dark:text-amber-500"
              aria-labelledby="review-overlaps"
            >
              <h3
                className="flex items-center gap-1.5 font-semibold"
                id="review-overlaps"
              >
                <IconAlertTriangle aria-hidden className="size-4" />
                Same owner, same time
              </h3>
              <ul className="list-disc pl-5">
                {[...view.overlaps.entries()].map(([id, others]) => (
                  <li key={id}>
                    {data.nameOf(id)} overlaps{" "}
                    {others.map((o) => `“${o}”`).join(", ")}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground">
                Give one of them to someone else, or link them so they happen
                one after the other.
              </p>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void arrangeChart()}
              type="button"
              variant="outline"
            >
              Arrange the chart
            </Button>
            <Link className="text-sm underline" href={chartHref}>
              Open the chart
            </Link>
            {arranged && (
              <span className="text-muted-foreground text-xs">
                Tasks laid out left to right in order.
              </span>
            )}
          </div>
        </div>
      )}
      <StepFooter
        error={error}
        nextDisabled={view?.status !== "ready"}
        onBack={onBack}
        onNext={onNext}
      />
    </>
  );
}

/** Step 7: agree the finish date, including the project buffer. */
export function CommitStep({
  data,
  onBack,
  goTo,
  chartHref,
}: Omit<ReviewProps, "onNext">) {
  const { project } = useDashboardContext();
  const confirm = useMutation(api.projects.confirmCommitment);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const view = data.chainView;

  if (view?.status !== "ready" || !view.datesKnown) {
    return (
      <>
        <StepTip>
          The commitment is the date you tell your partner. It needs a start
          date and a worked-out critical chain first.
        </StepTip>
        <Blocked data={data} goTo={goTo} />
        {view?.status === "ready" && (
          <Button onClick={() => goTo("goal")} type="button" variant="outline">
            Set the start date
          </Button>
        )}
        <StepFooter onBack={onBack} />
      </>
    );
  }

  const date = view.commitment.date;
  const overBy = view.commitment.daysOverDeadline;
  const committed = project.commitment?.date;
  const current = committed === date;

  const confirmDate = async () => {
    setSaving(true);
    setError(null);
    try {
      await confirm({ projectId: data.projectId, date });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <StepTip>
        The commitment is the date you&apos;ll tell your partner. It includes
        the project buffer, so the team can absorb normal delays and still
        deliver on time.
      </StepTip>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Start</dt>
        <dd>{formatPlanDate(project.startDate ?? data.today, data.today)}</dd>
        <dt className="text-muted-foreground">Critical chain</dt>
        <dd>{formatDays(view.chainDays)}</dd>
        <dt className="text-muted-foreground">Project buffer</dt>
        <dd>{formatDays(view.projectBufferDays)}</dd>
        <dt className="font-medium">Commitment</dt>
        <dd className="font-medium">{formatPlanDate(date, data.today)}</dd>
        <dt className="text-muted-foreground">Deadline</dt>
        <dd>
          {project.deadline
            ? formatPlanDate(project.deadline, data.today)
            : "not set"}
        </dd>
      </dl>

      {overBy > 0 && (
        <div
          className="space-y-2 rounded-md border border-amber-500/50 p-3 text-sm text-amber-600 dark:text-amber-500"
          role="alert"
        >
          <p className="flex items-start gap-1.5">
            <IconAlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            The plan needs {formatDays(overBy)} more than the deadline allows.
          </p>
          <p className="text-muted-foreground">
            Unlink tasks that can run at the same time, cut a task from the
            chain, or agree a later deadline with your partner.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => goTo("links")}
              size="sm"
              type="button"
              variant="outline"
            >
              Review links
            </Button>
            <Button
              onClick={() => goTo("goal")}
              size="sm"
              type="button"
              variant="outline"
            >
              Change the deadline
            </Button>
          </div>
        </div>
      )}

      {current ? (
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
            <IconCircleCheck aria-hidden className="size-4" />
            Committed to {formatPlanDate(date, data.today)}.
          </p>
          <p className="text-muted-foreground">
            Next: open the chart, and ask each student to give their update from
            My tasks every week.
          </p>
          <Link className="underline" href={chartHref}>
            Open the chart
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {committed && (
            <p className="text-muted-foreground text-sm">
              You committed to {formatPlanDate(committed, data.today)} before,
              but the plan has changed since.
            </p>
          )}
          <Button
            disabled={saving}
            onClick={() => void confirmDate()}
            type="button"
          >
            {overBy > 0 ? "Commit anyway to " : "Commit to "}
            {formatPlanDate(date, data.today)}
          </Button>
        </div>
      )}
      <StepFooter error={error} onBack={onBack} />
    </>
  );
}
