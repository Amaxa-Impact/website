"use client";

import type { ChainView } from "@/lib/chain-view";
import Link from "next/link";
import { formatPlanDate } from "@/lib/chain-view";
import { formatDays } from "@/lib/estimates";
import { IconAlertTriangle } from "@tabler/icons-react";

/** "Likely finish: {earliest} – {latest} · Deadline: {deadline}" for the chart. */
export function FinishRange({
  view,
  deadline,
  committedDate,
  settingsHref,
}: {
  view: ChainView;
  deadline?: string;
  /** The date confirmed at the end of guided setup. */
  committedDate?: string;
  settingsHref: string;
}) {
  const settingsLink = (text: string) => (
    <Link className="underline" href={settingsHref}>
      {text}
    </Link>
  );

  let finish: React.ReactNode;
  if (view.status !== "ready") {
    finish = (
      <span className="text-muted-foreground">
        appears once the critical chain can be worked out
      </span>
    );
  } else if (!view.datesKnown) {
    finish = (
      <span className="text-muted-foreground">
        {settingsLink("set a start date")} to see it
      </span>
    );
  } else {
    const { earliest, latest } = view.finish;
    // ISO dates compare correctly as strings.
    const tone = (iso: string) =>
      deadline !== undefined && iso > deadline
        ? "text-danger"
        : "text-foreground";
    finish =
      earliest === latest ? (
        <span className={tone(earliest)}>{formatPlanDate(earliest)}</span>
      ) : (
        <>
          <span className={tone(earliest)}>{formatPlanDate(earliest)}</span>
          {" – "}
          <span className={tone(latest)}>{formatPlanDate(latest)}</span>
        </>
      );
  }

  const overBy =
    view.status === "ready" && view.datesKnown
      ? view.commitment.daysOverDeadline
      : 0;
  const guesses = view.status === "ready" ? view.progressWarnings : [];
  const guessedTasks = new Set(guesses.map((g) => g.taskId)).size;

  return (
    <div
      aria-label="Finish range"
      className="text-muted-foreground flex flex-col gap-1 border-b px-6 py-2 text-sm"
      role="region"
    >
      <p>
        <span className="font-medium">Likely finish:</span> {finish}
        {" · "}
        <span className="font-medium">Deadline:</span>{" "}
        {deadline === undefined ? (
          settingsLink("not set")
        ) : (
          <span className="text-foreground">{formatPlanDate(deadline)}</span>
        )}
        {committedDate && (
          <>
            {" · "}
            <span className="font-medium">Committed:</span>{" "}
            <span className="text-foreground">
              {formatPlanDate(committedDate)}
            </span>
          </>
        )}
        {guessedTasks > 0 && (
          <span
            className="ml-2 text-xs"
            title={guesses.map((g) => g.message).join("\n")}
          >
            (rough: {guessedTasks}{" "}
            {guessedTasks === 1 ? "task is" : "tasks are"} missing start, finish
            or days-left details)
          </span>
        )}
      </p>
      {overBy > 0 && view.status === "ready" && (
        <p className="text-warning flex items-start gap-1.5" role="alert">
          <IconAlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            The plan needs until {formatPlanDate(view.commitment.date)},{" "}
            {formatDays(overBy)} past the deadline. Shorten the critical chain
            or agree a later deadline before you commit.
          </span>
        </p>
      )}
    </div>
  );
}
