"use client";

import type { ChainView } from "@/lib/chain-view";
import Link from "next/link";
import { formatDays } from "@/lib/estimates";
import { Panel } from "@xyflow/react";

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

/** Sums up the critical chain, or says what's stopping it being worked out. */
export function ChainStatusPanel({
  view,
  settingsHref,
  setupHref,
}: {
  view: ChainView;
  settingsHref: string;
  /** Offered on an empty chart to people who can run guided setup. */
  setupHref?: string;
}) {
  let body: React.ReactNode;
  switch (view.status) {
    case "ready":
      body = (
        <>
          <p className="text-foreground font-medium">
            Critical chain: {plural(view.chain.length, "task")},{" "}
            {formatDays(view.chainDays)}
          </p>
          <p>Project buffer: {formatDays(view.projectBufferDays)}</p>
          {!view.datesKnown && (
            <p>
              <Link className="underline" href={settingsHref}>
                Set a start date
              </Link>{" "}
              to see when side chains need to start.
            </p>
          )}
        </>
      );
      break;
    case "needs_estimates":
      body = (
        <p>
          {plural(view.taskIds.length, "task")}{" "}
          {view.taskIds.length === 1 ? "needs" : "need"} a best-case estimate.
          The critical chain and buffers appear once every task has one.
        </p>
      );
      break;
    case "cycle":
      body = (
        <>
          <p className="text-foreground font-medium">{view.message}</p>
          <p>Remove one of these links to see the critical chain.</p>
        </>
      );
      break;
    case "error":
      body = <p>{view.message}</p>;
      break;
    case "empty":
      body = (
        <p>
          Add tasks and link them to see the critical chain
          {setupHref ? (
            <>
              , or{" "}
              <Link className="underline" href={setupHref}>
                use the guided setup
              </Link>
              .
            </>
          ) : (
            "."
          )}
        </p>
      );
      break;
  }

  return (
    <Panel position="top-left">
      <div
        aria-live="polite"
        className="bg-card/95 text-muted-foreground max-w-80 space-y-0.5 rounded-lg border px-3 py-2 text-xs shadow-sm"
        role="status"
      >
        {body}
      </div>
    </Panel>
  );
}
