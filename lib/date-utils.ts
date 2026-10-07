import { ApiError } from "./api-response";

/** "YYYY-MM-DD" -> Date at 00:00 UTC (matches Prisma @db.Date). */
export function parseDateOnly(s: string): Date {
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid date");
  }
  return d;
}

export function addDaysUTC(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

export function todayUTC(): Date {
  return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
}

export function toISODate(d: Date | string): string {
  return (typeof d === "string" ? d : d.toISOString()).slice(0, 10);
}

export function formatDate(d: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(d));
}
