// The only place that does date arithmetic. The engine works in whole calendar
// days; switching to working days later means changing this file (and the
// callers that pass day counts), not the scheduling logic.

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since 1970-01-01 for a YYYY-MM-DD date. Throws RangeError if invalid. */
export function parseIsoDate(iso: string): number {
  const match = ISO_DATE.exec(iso);
  if (!match) {
    throw new RangeError(`"${iso}" is not a date in YYYY-MM-DD format`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ms = Date.UTC(year, month - 1, day);
  const date = new Date(ms);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError(`"${iso}" is not a real calendar date`);
  }
  return ms / MS_PER_DAY;
}

export function formatIsoDate(epochDay: number): string {
  return new Date(epochDay * MS_PER_DAY).toISOString().slice(0, 10);
}

/** The date `days` calendar days after `iso`. */
export function addDays(iso: string, days: number): string {
  return formatIsoDate(parseIsoDate(iso) + days);
}

/** Whole calendar days from `fromIso` to `toIso` (negative if earlier). */
export function diffInDays(fromIso: string, toIso: string): number {
  return parseIsoDate(toIso) - parseIsoDate(fromIso);
}
