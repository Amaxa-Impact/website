"use client";

import type { UserOption } from "@/components/user-dropdown";
import type { ChainView } from "@/lib/chain-view";
import { useMemo, useState } from "react";
import { useDashboardContext } from "@/components/dashboard/context";
import { getUserDisplayName } from "@/components/user-dropdown";
import { buildChainView, localIsoDate } from "@/lib/chain-view";
import { useQuery } from "convex/react";

import type { Id } from "@amaxa/backend/_generated/dataModel";
import { api } from "@amaxa/backend/_generated/api";

export interface SetupTaskRow {
  id: Id<"tasks">;
  label: string;
  assignedTo?: string;
  bestDays?: number;
  safeDays?: number;
}

export interface SetupData {
  projectId: Id<"projects">;
  tasks: SetupTaskRow[];
  edges: { id: Id<"edges">; source: string; target: string }[];
  members: { userId: string; name: string }[];
  chainView: ChainView | null;
  today: string;
  nameOf: (taskId: string) => string;
  ownerName: (userId: string | undefined) => string | undefined;
}

/** Everything the setup steps read, or undefined while it loads. */
export function useSetupData(projectId: Id<"projects">): SetupData | undefined {
  const { project } = useDashboardContext();
  const nodes = useQuery(api.tasks.listForProject, { projectId });
  const edges = useQuery(api.edges.listForProject, { projectId });
  const memberships = useQuery(api.userToProjects.listUsersForProject, {
    projectId,
  });
  const allUsers = useQuery(api.users.listAll, {}) as UserOption[] | undefined;
  const [today] = useState(localIsoDate);

  return useMemo(() => {
    if (!nodes || !edges || !memberships) {
      return undefined;
    }
    // Canvas order (top to bottom, then left to right) reads like the chart.
    const tasks: SetupTaskRow[] = [...nodes]
      .sort(
        (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
      )
      .map((node) => ({
        id: node.id as Id<"tasks">,
        label: node.data.label ?? "Untitled task",
        ...(node.data.assignedTo ? { assignedTo: node.data.assignedTo } : {}),
        ...(node.data.bestDays === undefined
          ? {}
          : { bestDays: node.data.bestDays }),
        ...(node.data.safeDays === undefined
          ? {}
          : { safeDays: node.data.safeDays }),
      }));

    const userName = new Map(
      (allUsers ?? []).map((user) => [user.id, getUserDisplayName(user)]),
    );
    const members = memberships.map((m) => ({
      userId: m.userId,
      name: userName.get(m.userId) ?? m.userId,
    }));
    const memberName = new Map(members.map((m) => [m.userId, m.name]));
    const taskName = new Map(tasks.map((t) => [t.id as string, t.label]));

    return {
      projectId,
      tasks,
      edges: edges.map((e) => ({
        id: e.id as Id<"edges">,
        source: e.source,
        target: e.target,
      })),
      members,
      chainView:
        nodes.length === 0
          ? null
          : buildChainView({ project, tasks: nodes, links: edges, today }),
      today,
      nameOf: (taskId) => taskName.get(taskId) ?? "Untitled task",
      ownerName: (userId) =>
        userId ? (memberName.get(userId) ?? userName.get(userId)) : undefined,
    };
  }, [allUsers, edges, memberships, nodes, project, projectId, today]);
}
