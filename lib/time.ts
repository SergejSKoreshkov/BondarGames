export const TIME_STEP_MIN = 15;

/** Round minutes-from-midnight to the nearest 15-min step. */
export function snapMinutes(min: number, step = TIME_STEP_MIN): number {
  return Math.round(min / step) * step;
}

/** Snap an "HH:MM" string to the nearest 15-min step. */
export function snapTime(value: string, step = TIME_STEP_MIN): string {
  if (!value) return value;
  const [h, m] = value.split(":").map((n) => parseInt(n, 10) || 0);
  const total = Math.min(snapMinutes(h * 60 + m, step), 23 * 60 + 45);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Snap the minute part of a "YYYY-MM-DDTHH:MM" datetime-local value. */
export function snapDateTimeLocal(value: string, step = TIME_STEP_MIN): string {
  if (!value || !value.includes("T")) return value;
  const [date, time] = value.split("T");
  return `${date}T${snapTime(time, step)}`;
}
