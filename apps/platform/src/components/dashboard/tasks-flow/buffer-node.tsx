"use client";

import type { NodeProps } from "@xyflow/react";
import { memo } from "react";
import { BUFFER_BOX, formatPlanDate } from "@/lib/chain-view";
import { formatDays } from "@/lib/estimates";
import { Handle, Position } from "@xyflow/react";

export interface BufferNodeData {
  kind: "project" | "feeding";
  sizeDays: number;
  startNow?: boolean;
  latestStartDate?: string;
}

/** A calculated buffer: drawn from the plan, never edited or stored. */
export const BufferNode = memo(({ data }: NodeProps) => {
  const buffer = data as unknown as BufferNodeData;
  const isProject = buffer.kind === "project";

  let note: string | undefined;
  if (!isProject) {
    if (buffer.startNow) {
      note = "Start this chain now";
    } else if (buffer.latestStartDate) {
      note = `Start by ${formatPlanDate(buffer.latestStartDate)}`;
    }
  }

  return (
    <div
      className={`flex flex-col justify-center rounded-lg border-2 border-dashed px-3 text-xs ${
        isProject
          ? "border-info bg-info-soft text-foreground"
          : "border-info-border bg-card text-foreground"
      }`}
      style={{ width: BUFFER_BOX.width, height: BUFFER_BOX.height }}
      title={
        isProject
          ? "Shared safety time for the whole project, after the last critical chain task."
          : "Safety time that keeps this side chain from delaying the critical chain."
      }
    >
      {isProject && (
        <Handle
          className="opacity-0"
          isConnectable={false}
          position={Position.Left}
          type="target"
        />
      )}
      <p className="text-muted-foreground font-medium">
        {isProject ? "Project buffer" : "Feeding buffer"}
      </p>
      <p className="text-sm font-semibold">{formatDays(buffer.sizeDays)}</p>
      {note && <p className="text-muted-foreground">{note}</p>}
    </div>
  );
});

BufferNode.displayName = "BufferNode";
