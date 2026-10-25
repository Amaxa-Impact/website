import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const taskStatusValidator = v.union(
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("blocked"),
  v.literal("waiting"),
);

/** The editable fields of a task, shared by create/list/update. */
export const taskDataValidator = v.object({
  label: v.optional(v.string()),
  description: v.optional(v.string()),
  status: v.optional(taskStatusValidator),
  assignedTo: v.optional(v.string()),
  dueDate: v.optional(v.number()),
  priority: v.optional(
    v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  ),
  bestDays: v.optional(v.number()),
  safeDays: v.optional(v.number()),
  workstreamId: v.optional(v.id("workstreams")),
  actualStart: v.optional(v.string()),
  actualFinish: v.optional(v.string()),
  daysRemaining: v.optional(v.number()),
  isExternal: v.optional(v.boolean()),
  externalContact: v.optional(v.string()),
  followUpDate: v.optional(v.string()),
});

export const bufferMethodValidator = v.union(
  v.literal("half"),
  v.literal("rss"),
);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function assertIsoDate(value: string | undefined, field: string): void {
  if (value !== undefined && !isIsoDate(value)) {
    throw new ConvexError(`${field} must be a date in YYYY-MM-DD format`);
  }
}

function assertPositive(value: number | undefined, field: string): void {
  if (value !== undefined && !(Number.isFinite(value) && value > 0)) {
    throw new ConvexError(`${field} must be a number greater than 0`);
  }
}

type CcpmTaskFields = Pick<
  Doc<"tasks">,
  | "bestDays"
  | "safeDays"
  | "daysRemaining"
  | "actualStart"
  | "actualFinish"
  | "followUpDate"
>;

/**
 * Validates the Critical Chain fields of a task. Pass the merged result of the
 * existing task and the incoming change so cross-field rules (safe >= best,
 * finish >= start) hold for partial updates.
 */
export function assertValidCcpmFields(fields: CcpmTaskFields): void {
  assertPositive(fields.bestDays, "bestDays");
  assertPositive(fields.safeDays, "safeDays");
  if (
    fields.bestDays !== undefined &&
    fields.safeDays !== undefined &&
    fields.safeDays < fields.bestDays
  ) {
    throw new ConvexError("safeDays must be greater than or equal to bestDays");
  }

  if (
    fields.daysRemaining !== undefined &&
    !(Number.isFinite(fields.daysRemaining) && fields.daysRemaining >= 0)
  ) {
    throw new ConvexError("daysRemaining must be 0 or more");
  }

  assertIsoDate(fields.actualStart, "actualStart");
  assertIsoDate(fields.actualFinish, "actualFinish");
  assertIsoDate(fields.followUpDate, "followUpDate");
  if (
    fields.actualStart !== undefined &&
    fields.actualFinish !== undefined &&
    fields.actualFinish < fields.actualStart
  ) {
    throw new ConvexError("actualFinish cannot be before actualStart");
  }
}

/** A task may only join a workstream from its own project. */
export async function assertWorkstreamInProject(
  ctx: QueryCtx | MutationCtx,
  workstreamId: Id<"workstreams"> | undefined,
  projectId: Id<"projects">,
): Promise<void> {
  if (workstreamId === undefined) {
    return;
  }
  const workstream = await ctx.db.get(workstreamId);
  if (!workstream || workstream.projectId !== projectId) {
    throw new ConvexError("Workstream does not belong to this project");
  }
}

/** Drops undefined entries so optional fields stay absent instead of null-ish. */
export function definedFields<T extends Record<string, unknown>>(
  fields: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
