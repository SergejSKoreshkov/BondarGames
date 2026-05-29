"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DayHours = { isClosed: boolean; openMinute: number; closeMinute: number };
type Weekly = Record<number, DayHours>;
type Exception = {
  id: string;
  date: string;
  isClosed: boolean;
  openMinute: number;
  closeMinute: number;
  note: string | null;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Display Monday-first to match the schedule.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function toTime(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function toMinutes(time: string) {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

export function AdminWorkingHours({
  initialWeekly,
  initialExceptions,
}: {
  initialWeekly: Weekly;
  initialExceptions: Exception[];
}) {
  return (
    <div className="space-y-8">
      <WeeklyEditor initial={initialWeekly} />
      <ExceptionsEditor initial={initialExceptions} />
    </div>
  );
}

function WeeklyEditor({ initial }: { initial: Weekly }) {
  const [days, setDays] = useState<Weekly>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function update(d: number, patch: Partial<DayHours>) {
    setDays((prev) => ({ ...prev, [d]: { ...prev[d], ...patch } }));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const payload = {
      days: DAY_ORDER.map((d) => ({ dayOfWeek: d, ...days[d] })),
    };
    const res = await fetch("/api/working-hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to save");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Weekly hours</h3>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-emerald-700">Saved.</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button type="button" onClick={save} disabled={busy} className="btn btn-sm glass-accent">
            {busy ? "Saving…" : "Save hours"}
          </button>
        </div>
      </div>
      <ul className="grid gap-2">
        {DAY_ORDER.map((d) => {
          const day = days[d];
          return (
            <li
              key={d}
              className="glass-soft rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3"
            >
              <span className="w-24 text-sm font-medium">{DAY_NAMES[d]}</span>
              <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={!day.isClosed}
                  onChange={(e) => update(d, { isClosed: !e.target.checked })}
                  className="accent-indigo-600"
                />
                Open
              </label>
              {!day.isClosed ? (
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="time"
                    step={900}
                    value={toTime(day.openMinute)}
                    onChange={(e) => update(d, { openMinute: toMinutes(e.target.value) })}
                    className="field"
                    style={{ width: "auto", height: 36 }}
                  />
                  <span className="text-[var(--muted)]">–</span>
                  <input
                    type="time"
                    step={900}
                    value={toTime(day.closeMinute)}
                    onChange={(e) => update(d, { closeMinute: toMinutes(e.target.value) })}
                    className="field"
                    style={{ width: "auto", height: 36 }}
                  />
                </div>
              ) : (
                <span className="text-sm text-[var(--muted)]">Closed</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ExceptionsEditor({ initial }: { initial: Exception[] }) {
  const [items, setItems] = useState<Exception[]>(initial);
  const [date, setDate] = useState("");
  const [closed, setClosed] = useState(false);
  const [open, setOpen] = useState("09:00");
  const [close, setClose] = useState("23:00");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/working-hours/exceptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        isClosed: closed,
        openMinute: toMinutes(open),
        closeMinute: toMinutes(close),
        note: note || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to add");
      return;
    }
    const row = (await res.json()) as Exception;
    setItems((prev) => {
      const next = prev.filter((p) => p.date !== row.date);
      return [...next, row].sort((a, b) => a.date.localeCompare(b.date));
    });
    setDate("");
    setNote("");
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    const res = await fetch(`/api/working-hours/exceptions/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      setItems((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">One-time overrides</h3>
      <p className="text-xs text-[var(--muted)]">
        Different hours for a specific date — a holiday closure or an extended evening. Overrides the
        weekly hours for that day only.
      </p>

      <form
        onSubmit={add}
        className="glass-soft rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 items-end"
      >
        <label className="block col-span-2 sm:col-span-1">
          <span className="block text-xs font-medium text-[var(--muted)] mb-1">Date</span>
          <input
            type="date"
            min={todayStr}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="field"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--muted)] h-[42px]">
          <input
            type="checkbox"
            checked={closed}
            onChange={(e) => setClosed(e.target.checked)}
            className="accent-indigo-600"
          />
          Closed all day
        </label>
        {!closed && (
          <>
            <label className="block">
              <span className="block text-xs font-medium text-[var(--muted)] mb-1">Open</span>
              <input
                type="time"
                step={900}
                value={open}
                onChange={(e) => setOpen(e.target.value)}
                className="field"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-[var(--muted)] mb-1">Close</span>
              <input
                type="time"
                step={900}
                value={close}
                onChange={(e) => setClose(e.target.value)}
                className="field"
              />
            </label>
          </>
        )}
        <label className="block col-span-2 sm:col-span-3">
          <span className="block text-xs font-medium text-[var(--muted)] mb-1">Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Public holiday"
            className="field"
          />
        </label>
        <div className="col-span-2 sm:col-span-1 flex items-end">
          <button type="submit" disabled={busy} className="btn btn-sm glass-accent w-full">
            {busy ? "…" : "Add override"}
          </button>
        </div>
        {error && <div className="col-span-2 sm:col-span-4 text-xs text-red-500">{error}</div>}
      </form>

      {items.length === 0 ? (
        <div className="text-sm text-[var(--muted)] px-1">No upcoming overrides.</div>
      ) : (
        <ul className="grid gap-2">
          {items.map((ex) => (
            <li
              key={ex.id}
              className="glass rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {new Intl.DateTimeFormat(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(`${ex.date}T00:00:00`))}
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {ex.isClosed
                    ? "Closed all day"
                    : `${toTime(ex.openMinute)} – ${toTime(ex.closeMinute)}`}
                  {ex.note ? ` · ${ex.note}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(ex.id)}
                disabled={busy}
                className="text-xs text-red-600 hover:underline shrink-0"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
