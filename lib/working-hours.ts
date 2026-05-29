import { prisma } from "@/lib/db";

export type DayHours = {
  isClosed: boolean;
  openMinute: number;
  closeMinute: number;
};

const DEFAULT_DAY: DayHours = { isClosed: false, openMinute: 540, closeMinute: 1380 };

/** Local Y-M-D key, so a JS Date maps to the same calendar day the user sees. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Ensures the seven weekly rows exist and returns them keyed by dayOfWeek. */
export async function getWeeklyHours(): Promise<Record<number, DayHours>> {
  const rows = await prisma.workingHours.findMany();
  const byDay = new Map(rows.map((r) => [r.dayOfWeek, r]));
  const missing = [0, 1, 2, 3, 4, 5, 6].filter((d) => !byDay.has(d));
  if (missing.length > 0) {
    await prisma.workingHours.createMany({
      data: missing.map((dayOfWeek) => ({ dayOfWeek, ...DEFAULT_DAY })),
      skipDuplicates: true,
    });
    const fresh = await prisma.workingHours.findMany();
    fresh.forEach((r) => byDay.set(r.dayOfWeek, r));
  }
  const result: Record<number, DayHours> = {};
  for (let d = 0; d < 7; d++) {
    const r = byDay.get(d);
    result[d] = r
      ? { isClosed: r.isClosed, openMinute: r.openMinute, closeMinute: r.closeMinute }
      : { ...DEFAULT_DAY };
  }
  return result;
}

/** Effective hours for each date in the given range (weekly defaults + exceptions). */
export async function getEffectiveHoursForRange(
  from: Date,
  to: Date,
): Promise<Record<string, DayHours & { isException: boolean; note: string | null }>> {
  const [weekly, exceptions] = await Promise.all([
    getWeeklyHours(),
    prisma.workingHoursException.findMany({
      where: { date: { gte: startOfDayUTC(from), lte: startOfDayUTC(to) } },
    }),
  ]);
  const exByKey = new Map(exceptions.map((e) => [dateKey(e.date), e]));
  const out: Record<string, DayHours & { isException: boolean; note: string | null }> = {};
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cursor <= end) {
    const key = dateKey(cursor);
    const ex = exByKey.get(key);
    if (ex) {
      out[key] = {
        isClosed: ex.isClosed,
        openMinute: ex.openMinute,
        closeMinute: ex.closeMinute,
        isException: true,
        note: ex.note,
      };
    } else {
      out[key] = { ...weekly[cursor.getDay()], isException: false, note: null };
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Effective hours for a single date. */
export async function getEffectiveHoursForDate(d: Date): Promise<DayHours & { isException: boolean }> {
  const ex = await prisma.workingHoursException.findUnique({ where: { date: startOfDayUTC(d) } });
  if (ex) {
    return {
      isClosed: ex.isClosed,
      openMinute: ex.openMinute,
      closeMinute: ex.closeMinute,
      isException: true,
    };
  }
  const weekly = await getWeeklyHours();
  return { ...weekly[d.getDay()], isException: false };
}

/**
 * Validates that an event [start, start+duration) fits inside that day's open
 * window. Returns null when valid, or a human-readable reason when not.
 * Rejects events that span past midnight (must stay within one day's window).
 */
export async function validateWithinWorkingHours(
  start: Date,
  durationMinutes: number,
): Promise<string | null> {
  const hours = await getEffectiveHoursForDate(start);
  if (hours.isClosed) {
    return "We're closed that day. Pick another date.";
  }
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = startMin + durationMinutes;
  if (startMin < hours.openMinute || endMin > hours.closeMinute) {
    return `Outside opening hours (${fmtMinute(hours.openMinute)}–${fmtMinute(hours.closeMinute)}).`;
  }
  return null;
}

export function fmtMinute(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Midnight UTC for the date's calendar day — matches Postgres DATE storage. */
function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
