"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardContext } from "@/components/dashboard/context";
import { getUserDisplayName } from "@/components/user-dropdown";
import { statusLabel, statusOptions } from "@/lib/task-status";
import type { TaskStatus } from "@/lib/task-status";
import { usePaginatedQuery, useQuery } from "convex/react";

import type { Id } from "@amaxa/backend/_generated/dataModel";
import type { UserOption } from "@/components/user-dropdown";
import { api } from "@amaxa/backend/_generated/api";
import { Badge } from "@amaxa/ui/badge";
import { Button } from "@amaxa/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@amaxa/ui/card";
import { Input } from "@amaxa/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@amaxa/ui/select";
import { Skeleton } from "@amaxa/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amaxa/ui/table";

interface TasksTableProps {
  projectId: Id<"projects">;
}


interface Filters {
  status: TaskStatus | undefined;
  assignedTo: string | undefined;
  searchLabel: string;
}

interface ProjectUser {
  userId: string;
}

const PAGE_SIZE = 10;

const statusVariants: Record<
  TaskStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  todo: "outline",
  in_progress: "secondary",
  completed: "default",
  blocked: "destructive",
  waiting: "secondary",
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function TableSkeleton() {
  return (
    <>
      {[
        "task-row-1",
        "task-row-2",
        "task-row-3",
        "task-row-4",
        "task-row-5",
      ].map((taskRowSkeletonId) => (
        <TableRow key={taskRowSkeletonId}>
          <TableCell>
            <Skeleton className="h-4 w-50" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-30" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function TasksTable({ projectId }: TasksTableProps) {
  const { project } = useDashboardContext();
  const ccpmV2 = project.ccpmV2 ?? false;
  const [filters, setFilters] = useState<Filters>({
    status: undefined,
    assignedTo: undefined,
    searchLabel: "",
  });

  const debouncedSearch = useDebounce(filters.searchLabel, 300);

  const args = {
    projectId,
    ...(filters.status && { status: filters.status }),
    ...(filters.assignedTo && { assignedTo: filters.assignedTo }),
    ...(debouncedSearch && { searchLabel: debouncedSearch }),
  };

  const { results, status, loadMore } = usePaginatedQuery(
    api.dashboard.listTasksPaginated,
    args,
    { initialNumItems: PAGE_SIZE },
  );

  const allUsers = useQuery(api.users.listAll, {}) as UserOption[] | undefined;
  const projectUsers = useQuery(api.dashboard.getProjectUsers, {
    projectId,
  }) as ProjectUser[] | undefined;

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of allUsers ?? []) {
      map.set(user.id, getUserDisplayName(user));
    }
    return map;
  }, [allUsers]);

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) {
      return "-";
    }
    return new Date(timestamp).toLocaleDateString();
  };

  const isLoading = status === "LoadingFirstPage";
  const canLoadMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input
            className="w-50"
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, searchLabel: e.target.value }))
            }
            placeholder="Search tasks..."
            value={filters.searchLabel}
          />

          <Select
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                status: value === "all" ? undefined : (value as TaskStatus),
              }))
            }
            value={filters.status ?? "all"}
          >
            <SelectTrigger className="w-35">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions(ccpmV2).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) => {
              const newValue =
                value === null || value === "all" ? undefined : value;
              setFilters((prev) => ({
                ...prev,
                assignedTo: newValue,
              }));
            }}
            value={filters.assignedTo ?? "all"}
          >
            <SelectTrigger className="w-45">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {projectUsers?.map((user) => (
                <SelectItem key={user.userId} value={user.userId}>
                  {userMap.get(user.userId) ?? user.userId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filters.status ?? filters.assignedTo ?? filters.searchLabel) && (
            <Button
              onClick={() =>
                setFilters({
                  status: undefined,
                  assignedTo: undefined,
                  searchLabel: "",
                })
              }
              variant="ghost"
            >
              Clear Filters
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task Name</TableHead>
              <TableHead>Due By</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton />
            ) : results.length === 0 ? (
              <TableRow>
                <TableCell
                  className="text-muted-foreground text-center"
                  colSpan={4}
                >
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              <>
                {results.map((task) => (
                  <TableRow key={task._id}>
                    <TableCell className="font-medium">{task.label}</TableCell>
                    <TableCell>{formatDate(task.dueDate)}</TableCell>
                    <TableCell>
                      {task.assignedTo
                        ? (userMap.get(task.assignedTo) ?? "Unknown")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {task.status ? (
                        <Badge variant={statusVariants[task.status]}>
                          {statusLabel(task.status, ccpmV2)}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Set</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {isLoadingMore && <TableSkeleton />}
              </>
            )}
          </TableBody>
        </Table>

        {!isLoading && results.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Showing {results.length} task{results.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              {canLoadMore && (
                <Button
                  disabled={isLoadingMore}
                  onClick={() => loadMore(PAGE_SIZE)}
                  size="sm"
                  variant="outline"
                >
                  {isLoadingMore ? "Loading..." : "Load More"}
                </Button>
              )}
              {status === "Exhausted" && (
                <span className="text-muted-foreground text-sm">
                  All tasks loaded
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
