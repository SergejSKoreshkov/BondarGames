"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { addDays, isoDateInputValue, sameDay, startOfWeek } from "@/lib/week";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { Glass } from "@/components/Glass";

export type ScheduleEvent = {
  id: string;
  title: string | null;
  description: string | null;
  gameName: string | null;
  startsAt: string;
  durationMinutes: number;
  maxPeople: number;
  location: string | null;
  isPrivate: boolean;
  status: "PENDING" | "CONFIRMED";
  shareToken?: string | null;
  createdBy: { id: string; name: string | null; email: string } | null;
  seatsTaken: number;
  bookedByMe?: boolean;
  isMine?: boolean;
};

export type DayHours = { isClosed: boolean; openMinute: number; closeMinute: number };
type WeeklyHours = Record<number, DayHours>;
type HoursException = {
  date: string;
  isClosed: boolean;
  openMinute: number;
  closeMinute: number;
};

// Desktop: vertical timeline (time = Y axis, days = columns).
const HOUR_PX_V = 52;
const TIME_COL_W = 56;
// Mobile: horizontal timeline (time = X axis, days = rows).
const HOUR_PX_H = 66;
const DAY_ROW_H = 58;
const DAY_LABEL_W = 56;

const DEFAULT_OPEN = 540; // 09:00 — fallback when every visible day is closed
const DEFAULT_CLOSE = 1380; // 23:00

function fmtTime(d: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d);
}
function fmtHourLabel(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}
function localDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function eventVisual(e: ScheduleEvent) {
  const pending = e.status === "PENDING";
  const cls = pending
    ? "bg-amber-50 text-amber-900 border border-amber-300/70 border-dashed shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_2px_6px_-2px_rgba(180,83,9,0.15)] hover:bg-amber-100"
    : e.isPrivate
      ? "bg-gradient-to-b from-slate-500 to-slate-600 text-white border border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_10px_-3px_rgba(15,23,42,0.25)] hover:brightness-105"
      : "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white border border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_14px_-4px_rgba(67,56,202,0.4)] hover:brightness-108";
  const label = pending && !e.title ? "Pending" : e.isPrivate && !e.title ? "Private" : e.title;
  return { cls, label };
}

export function Schedule({
  events,
  canBook,
  emailVerified,
  publicPricePerPerson,
  privatePricePerEvent,
  isAdmin,
  weeklyHours,
  exceptions,
}: {
  events: ScheduleEvent[];
  canBook: boolean;
  emailVerified: boolean;
  publicPricePerPerson: number;
  privatePricePerEvent: number;
  isAdmin: boolean;
  weeklyHours: WeeklyHours;
  exceptions: HoursException[];
}) {
  const exceptionByDate = useMemo(
    () => new Map(exceptions.map((e) => [e.date, e])),
    [exceptions],
  );
  const hoursForDay = useMemo(
    () =>
      (d: Date): DayHours => {
        const ex = exceptionByDate.get(localDateKey(d));
        if (ex) {
          return { isClosed: ex.isClosed, openMinute: ex.openMinute, closeMinute: ex.closeMinute };
        }
        return weeklyHours[d.getDay()] ?? { isClosed: false, openMinute: 0, closeMinute: 1440 };
      },
    [exceptionByDate, weeklyHours],
  );
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [showCreate, setShowCreate] = useState(false);
  const [prefillFrom, setPrefillFrom] = useState<Date | null>(null);
  const [createdResult, setCreatedResult] = useState<
    | { shareUrl: string | null; status: "PENDING" | "CONFIRMED" }
    | null
  >(null);
  const [active, setActive] = useState<ScheduleEvent | null>(null);

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const eventsThisWeek = useMemo(() => {
    return events.filter((e) => {
      const t = new Date(e.startsAt).getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    });
  }, [events, weekStart, weekEnd]);

  function openCreate(from?: Date) {
    setPrefillFrom(from ?? null);
    setShowCreate(true);
  }

  function onCreated(result: { shareToken: string | null; status: "PENDING" | "CONFIRMED" }) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setCreatedResult({
      shareUrl: result.shareToken ? `${origin}/event/${result.shareToken}` : null,
      status: result.status,
    });
    setShowCreate(false);
  }

  const today = new Date();

  // Visible time window = earliest open → latest close across the week's open
  // days, snapped to whole hours. Hours outside this window are never rendered,
  // so the scale tracks the configured working hours.
  const { viewStartMin, viewEndMin } = useMemo(() => {
    const open: number[] = [];
    const close: number[] = [];
    for (const d of days) {
      const h = hoursForDay(d);
      if (!h.isClosed) {
        open.push(h.openMinute);
        close.push(h.closeMinute);
      }
    }
    const o = open.length ? Math.min(...open) : DEFAULT_OPEN;
    const c = close.length ? Math.max(...close) : DEFAULT_CLOSE;
    return {
      viewStartMin: Math.floor(o / 60) * 60,
      viewEndMin: Math.ceil(c / 60) * 60,
    };
  }, [days, hoursForDay]);

  function handleEmptyClick(day: Date, startMin: number) {
    if (!(canBook && emailVerified)) return;
    const h = hoursForDay(day);
    if (h.isClosed) return;
    if (startMin < h.openMinute || startMin >= h.closeMinute) return;
    const from = new Date(day);
    from.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
    if (from.getTime() < Date.now()) return;
    openCreate(from);
  }

  const eventsForDay = (d: Date) =>
    eventsThisWeek.filter((e) => sameDay(new Date(e.startsAt), d));

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeekNav weekStart={weekStart} onChange={setWeekStart} />
        <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
          <div className="hidden sm:flex items-center gap-3">
            <Legend swatch="bg-gradient-to-b from-indigo-500 to-indigo-600" label={`${formatPrice(publicPricePerPerson)} pp`} />
            <Legend swatch="bg-gradient-to-b from-slate-500 to-slate-600" label={`${formatPrice(privatePricePerEvent)} flat`} />
          </div>
          {canBook && emailVerified ? (
            <button type="button" onClick={() => openCreate()} className="btn btn-sm glass-accent">
              Host a game
            </button>
          ) : canBook ? (
            <span className="text-amber-700">Verify email to host</span>
          ) : (
            <Link href="/auth/signin" className="btn btn-sm glass-accent">
              Sign in to host
            </Link>
          )}
        </div>
      </div>

      <div className="schedule-surface rounded-3xl overflow-hidden">
        {/* Desktop: vertical timeline (time = rows, days = columns) */}
        <div className="hidden sm:block">
          <VerticalGrid
            days={days}
            today={today}
            hoursForDay={hoursForDay}
            eventsForDay={eventsForDay}
            viewStartMin={viewStartMin}
            viewEndMin={viewEndMin}
            onEmptyClick={handleEmptyClick}
            onEventClick={setActive}
          />
        </div>
        {/* Mobile: horizontal timeline (time = columns, days = rows) */}
        <div className="sm:hidden">
          <HorizontalGrid
            days={days}
            today={today}
            hoursForDay={hoursForDay}
            eventsForDay={eventsForDay}
            viewStartMin={viewStartMin}
            viewEndMin={viewEndMin}
            onEmptyClick={handleEmptyClick}
            onEventClick={setActive}
          />
        </div>
      </div>

      {active && (
        <EventDetailDialog
          event={active}
          onClose={() => setActive(null)}
          canBook={canBook}
          emailVerified={emailVerified}
          isAdmin={isAdmin}
          publicPricePerPerson={publicPricePerPerson}
          privatePricePerEvent={privatePricePerEvent}
        />
      )}

      {showCreate && (
        <CreateEventDialog
          prefillStart={prefillFrom}
          onClose={() => setShowCreate(false)}
          onCreated={onCreated}
          publicPricePerPerson={publicPricePerPerson}
          privatePricePerEvent={privatePricePerEvent}
        />
      )}

      {createdResult && (
        <CreatedDialog
          shareUrl={createdResult.shareUrl}
          status={createdResult.status}
          onClose={() => setCreatedResult(null)}
        />
      )}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${swatch} shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]`} />
      {label}
    </span>
  );
}

function WeekNav({
  weekStart,
  onChange,
}: {
  weekStart: Date;
  onChange: (d: Date) => void;
}) {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const label = sameMonth
    ? `${weekStart.getDate()} – ${end.getDate()} ${new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(weekStart)}`
    : `${new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(weekStart)} – ${new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(end)}`;
  const todayWeek = startOfWeek(new Date());
  const isThisWeek = weekStart.getTime() === todayWeek.getTime();

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(addDays(weekStart, -7))}
        className="glass glass-hover h-9 w-9 rounded-full text-base"
        aria-label="Previous week"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => onChange(todayWeek)}
        disabled={isThisWeek}
        className="glass glass-hover h-9 px-3 rounded-full text-xs disabled:opacity-50"
      >
        Today
      </button>
      <button
        type="button"
        onClick={() => onChange(addDays(weekStart, 7))}
        className="glass glass-hover h-9 w-9 rounded-full text-base"
        aria-label="Next week"
      >
        ›
      </button>
      <div className="ml-2 text-sm font-semibold whitespace-nowrap">{label}</div>
      <label className="ml-3 hidden sm:block">
        <span className="sr-only">Jump to week</span>
        <input
          type="date"
          value={isoDateInputValue(weekStart)}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            onChange(startOfWeek(new Date(v + "T00:00:00")));
          }}
          className="field h-9 text-xs"
          style={{ width: "auto" }}
        />
      </label>
    </div>
  );
}

type GridProps = {
  days: Date[];
  today: Date;
  hoursForDay: (d: Date) => DayHours;
  eventsForDay: (d: Date) => ScheduleEvent[];
  viewStartMin: number;
  viewEndMin: number;
  onEmptyClick: (day: Date, startMin: number) => void;
  onEventClick: (e: ScheduleEvent) => void;
};

const CLOSED_HATCH =
  "bg-[repeating-linear-gradient(135deg,rgba(15,23,42,0.06),rgba(15,23,42,0.06)_6px,rgba(15,23,42,0.02)_6px,rgba(15,23,42,0.02)_12px)]";

function hourMarks(viewStartMin: number, viewEndMin: number) {
  const marks: number[] = [];
  for (let h = viewStartMin / 60; h <= viewEndMin / 60; h++) marks.push(h);
  return marks;
}

function dayHeader(d: Date, today: Date) {
  const isToday = sameDay(d, today);
  return { isToday, weekday: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d) };
}

/* ------------------------------- Desktop ------------------------------- */

function VerticalGrid({
  days,
  today,
  hoursForDay,
  eventsForDay,
  viewStartMin,
  viewEndMin,
  onEmptyClick,
  onEventClick,
}: GridProps) {
  const px = (min: number) => ((min - viewStartMin) / 60) * HOUR_PX_V;
  const totalH = ((viewEndMin - viewStartMin) / 60) * HOUR_PX_V;
  const marks = hourMarks(viewStartMin, viewEndMin);
  const cols = `${TIME_COL_W}px repeat(7, minmax(96px, 1fr))`;

  return (
    <div className="overflow-x-auto">
      {/* Day headers */}
      <div className="grid border-b border-white/50 bg-white/30" style={{ gridTemplateColumns: cols }}>
        <div className="sticky left-0 z-20 bg-white/85 backdrop-blur-md border-r border-white/50" />
        {days.map((d) => {
          const { isToday, weekday } = dayHeader(d, today);
          return (
            <div
              key={d.toISOString()}
              className={`px-1 py-2 text-center ${isToday ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}
            >
              <div className="uppercase tracking-wide text-xs">{weekday}</div>
              <div
                className={`text-sm font-semibold leading-tight ${
                  isToday
                    ? "inline-flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-b from-indigo-500 to-indigo-600 text-white mt-0.5 shadow-[0_3px_8px_-2px_rgba(67,56,202,0.4)]"
                    : ""
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div className="grid relative" style={{ gridTemplateColumns: cols, height: totalH }}>
        {/* Time axis */}
        <div className="sticky left-0 z-20 bg-white/85 backdrop-blur-md border-r border-white/50">
          {marks.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 text-[10px] text-[var(--muted)] font-mono pr-2 text-right select-none"
              style={{ top: px(h * 60) - 6 }}
            >
              {fmtHourLabel(h)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((d, dayIdx) => {
          const hours = hoursForDay(d);
          const openFrom = Math.max(hours.openMinute, viewStartMin);
          const openTo = Math.min(hours.closeMinute, viewEndMin);
          return (
            <div
              key={d.toISOString()}
              className={`relative ${dayIdx === 6 ? "" : "border-r border-white/50"}`}
            >
              {/* Closed shading */}
              {hours.isClosed ? (
                <div
                  aria-hidden
                  className={`absolute inset-0 pointer-events-none ${CLOSED_HATCH}`}
                />
              ) : (
                <>
                  {openFrom > viewStartMin && (
                    <div
                      aria-hidden
                      className={`absolute left-0 right-0 pointer-events-none ${CLOSED_HATCH}`}
                      style={{ top: 0, height: px(openFrom) }}
                    />
                  )}
                  {openTo < viewEndMin && (
                    <div
                      aria-hidden
                      className={`absolute left-0 right-0 pointer-events-none ${CLOSED_HATCH}`}
                      style={{ top: px(openTo), height: totalH - px(openTo) }}
                    />
                  )}
                </>
              )}
              {/* Hour cells */}
              {marks.slice(0, -1).map((h) => {
                const startMin = h * 60;
                const bookable = !hours.isClosed && startMin >= openFrom && startMin < openTo;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onEmptyClick(d, startMin)}
                    className={`absolute left-0 right-0 transition-colors ${
                      h === viewStartMin / 60 ? "" : "border-t border-white/40"
                    } ${bookable ? "hover:bg-white/45 cursor-pointer" : "cursor-default"}`}
                    style={{ top: px(startMin), height: HOUR_PX_V }}
                    aria-label={`${fmtHourLabel(h)} ${d.toDateString()}`}
                    tabIndex={bookable ? 0 : -1}
                  />
                );
              })}
              {/* Events */}
              {eventsForDay(d).map((e) => {
                const start = new Date(e.startsAt);
                const sMin = start.getHours() * 60 + start.getMinutes();
                const top = px(sMin);
                const height = Math.max((e.durationMinutes / 60) * HOUR_PX_V - 2, 18);
                const { cls, label } = eventVisual(e);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onEventClick(e)}
                    className={`absolute left-1 right-1 rounded-[10px] text-xs px-2 py-1 text-left overflow-hidden transition z-10 ${cls}`}
                    style={{ top, height }}
                  >
                    <div className="font-semibold truncate leading-tight">{label}</div>
                    <div className="opacity-85 truncate leading-tight">{fmtTime(start)}</div>
                  </button>
                );
              })}
              {/* Now line */}
              {sameDay(d, today) &&
                (() => {
                  const nowMin = today.getHours() * 60 + today.getMinutes();
                  if (nowMin < viewStartMin || nowMin > viewEndMin) return null;
                  return (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: px(nowMin) }}>
                      <div className="relative h-0">
                        <div className="absolute left-0 right-0 h-px bg-red-500/80" />
                        <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                      </div>
                    </div>
                  );
                })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------- Mobile -------------------------------- */

function HorizontalGrid({
  days,
  today,
  hoursForDay,
  eventsForDay,
  viewStartMin,
  viewEndMin,
  onEmptyClick,
  onEventClick,
}: GridProps) {
  const px = (min: number) => ((min - viewStartMin) / 60) * HOUR_PX_H;
  const laneW = ((viewEndMin - viewStartMin) / 60) * HOUR_PX_H;
  const marks = hourMarks(viewStartMin, viewEndMin);

  return (
    <div className="overflow-x-auto">
      <div style={{ width: DAY_LABEL_W + laneW }}>
        {/* Time axis header */}
        <div className="flex h-8 border-b border-white/50 bg-white/30">
          <div className="sticky left-0 z-20 shrink-0 bg-white/85 backdrop-blur-md border-r border-white/50" style={{ width: DAY_LABEL_W }} />
          <div className="relative" style={{ width: laneW }}>
            {marks.slice(0, -1).map((h) => (
              <div
                key={h}
                className="absolute top-0 bottom-0 flex items-center text-[10px] text-[var(--muted)] font-mono pl-1 select-none border-l border-white/40"
                style={{ left: px(h * 60) }}
              >
                {fmtHourLabel(h)}
              </div>
            ))}
          </div>
        </div>

        {/* Day rows */}
        {days.map((d) => {
          const hours = hoursForDay(d);
          const { isToday, weekday } = dayHeader(d, today);
          const openFrom = Math.max(hours.openMinute, viewStartMin);
          const openTo = Math.min(hours.closeMinute, viewEndMin);
          return (
            <div key={d.toISOString()} className="flex border-b border-white/40 last:border-b-0" style={{ height: DAY_ROW_H }}>
              {/* Day label (sticky) */}
              <div
                className={`sticky left-0 z-20 shrink-0 bg-white/85 backdrop-blur-md border-r border-white/50 flex flex-col items-center justify-center ${
                  isToday ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                }`}
                style={{ width: DAY_LABEL_W }}
              >
                <span className="uppercase text-[10px] tracking-wide">{weekday}</span>
                <span
                  className={`text-sm font-semibold leading-tight ${
                    isToday
                      ? "inline-flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-[0_3px_8px_-2px_rgba(67,56,202,0.4)]"
                      : ""
                  }`}
                >
                  {d.getDate()}
                </span>
              </div>

              {/* Lane */}
              <div className="relative" style={{ width: laneW }}>
                {/* Closed shading */}
                {hours.isClosed ? (
                  <div aria-hidden className={`absolute inset-0 pointer-events-none ${CLOSED_HATCH}`} />
                ) : (
                  <>
                    {openFrom > viewStartMin && (
                      <div
                        aria-hidden
                        className={`absolute top-0 bottom-0 pointer-events-none ${CLOSED_HATCH}`}
                        style={{ left: 0, width: px(openFrom) }}
                      />
                    )}
                    {openTo < viewEndMin && (
                      <div
                        aria-hidden
                        className={`absolute top-0 bottom-0 pointer-events-none ${CLOSED_HATCH}`}
                        style={{ left: px(openTo), width: laneW - px(openTo) }}
                      />
                    )}
                  </>
                )}
                {/* Hour cells */}
                {marks.slice(0, -1).map((h) => {
                  const startMin = h * 60;
                  const bookable = !hours.isClosed && startMin >= openFrom && startMin < openTo;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => onEmptyClick(d, startMin)}
                      className={`absolute top-0 bottom-0 transition-colors ${
                        h === viewStartMin / 60 ? "" : "border-l border-white/40"
                      } ${bookable ? "active:bg-white/45" : "cursor-default"}`}
                      style={{ left: px(startMin), width: HOUR_PX_H }}
                      aria-label={`${fmtHourLabel(h)} ${d.toDateString()}`}
                      tabIndex={bookable ? 0 : -1}
                    />
                  );
                })}
                {/* Events */}
                {eventsForDay(d).map((e) => {
                  const start = new Date(e.startsAt);
                  const sMin = start.getHours() * 60 + start.getMinutes();
                  const left = px(sMin);
                  const width = Math.max((e.durationMinutes / 60) * HOUR_PX_H - 2, 36);
                  const { cls, label } = eventVisual(e);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onEventClick(e)}
                      className={`absolute top-1 bottom-1 rounded-[10px] text-[11px] px-2 py-1 text-left overflow-hidden transition z-10 ${cls}`}
                      style={{ left, width }}
                    >
                      <div className="font-semibold truncate leading-tight">{label}</div>
                      <div className="opacity-85 truncate leading-tight">{fmtTime(start)}</div>
                    </button>
                  );
                })}
                {/* Now line */}
                {isToday &&
                  (() => {
                    const nowMin = today.getHours() * 60 + today.getMinutes();
                    if (nowMin < viewStartMin || nowMin > viewEndMin) return null;
                    return (
                      <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: px(nowMin) }}>
                        <div className="relative w-0 h-full">
                          <div className="absolute top-0 bottom-0 w-px bg-red-500/80" />
                          <div className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-red-500" />
                        </div>
                      </div>
                    );
                  })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventDetailDialog({
  event,
  onClose,
  canBook,
  emailVerified,
  isAdmin,
  publicPricePerPerson,
  privatePricePerEvent,
}: {
  event: ScheduleEvent;
  onClose: () => void;
  canBook: boolean;
  emailVerified: boolean;
  isAdmin: boolean;
  publicPricePerPerson: number;
  privatePricePerEvent: number;
}) {
  const [people, setPeople] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(startsAt.getTime() + event.durationMinutes * 60_000);
  const seatsLeft = event.maxPeople - event.seatsTaken;
  const isFull = seatsLeft <= 0;
  const msUntil = startsAt.getTime() - Date.now();
  const isPending = event.status === "PENDING";
  // Host can withdraw a pending event at any time; the 24h rule only applies to confirmed events.
  const canDelete = isAdmin || (event.isMine && (isPending || msUntil >= 24 * 60 * 60 * 1000));
  const isPrivateLocked = event.isPrivate && !event.isMine && !isAdmin;
  const isLockedByPending = isPending && !event.isMine && !isAdmin;

  async function book() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.id, people }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Booking failed");
      return;
    }
    onClose();
    router.refresh();
  }

  async function approveEvent() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/events/${event.id}/confirm`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Could not confirm");
      return;
    }
    onClose();
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete "${event.title ?? "this event"}"?`)) return;
    setBusy(true);
    const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Could not delete");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-slate-900/15 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <Glass cornerRadius={28} padding="24px">
        <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-[var(--muted)] font-mono">
              {fmtTime(startsAt)} – {fmtTime(endsAt)}
            </div>
            <h2 className="text-lg font-semibold truncate mt-0.5">
              {isLockedByPending
                ? "Pending booking"
                : isPrivateLocked
                  ? "Private booking"
                  : event.title}
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              {isPending && (
                <span className="glass-warn inline-flex h-5 px-2 items-center rounded-full text-[10px] font-medium uppercase tracking-wide">
                  Pending
                </span>
              )}
              {event.isPrivate && !isLockedByPending && (
                <span className="glass-soft inline-flex h-5 px-2 items-center rounded-full text-zinc-700 text-[10px] font-medium uppercase tracking-wide">
                  Private
                </span>
              )}
            </div>
            {!isPrivateLocked && !isLockedByPending && event.gameName && (
              <div className="text-sm text-[var(--muted)] mt-1">{event.gameName}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glass glass-hover h-8 w-8 shrink-0 rounded-full"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {isLockedByPending ? (
          <p className="text-sm text-[var(--muted)]">
            This slot is being held for an event that's waiting for admin approval. It'll show up here once it's confirmed.
          </p>
        ) : isPrivateLocked ? (
          <p className="text-sm text-[var(--muted)]">
            This slot is reserved for a private event. The host shared an invite link with their group.
          </p>
        ) : (
          <>
            {event.description && (
              <p className="text-sm text-[var(--muted)]">{event.description}</p>
            )}
            <dl className="text-sm grid grid-cols-2 gap-y-1">
              {event.location && (
                <>
                  <dt className="text-[var(--muted)]">Location</dt>
                  <dd>{event.location}</dd>
                </>
              )}
              <dt className="text-[var(--muted)]">Hosted by</dt>
              <dd className="truncate">
                {event.createdBy?.name ?? event.createdBy?.email ?? "—"}
              </dd>
              <dt className="text-[var(--muted)]">Seats</dt>
              <dd>
                {event.seatsTaken}/{event.maxPeople} ({seatsLeft} left)
              </dd>
              <dt className="text-[var(--muted)]">Price</dt>
              <dd>
                {event.isPrivate
                  ? `${formatPrice(privatePricePerEvent)} flat`
                  : `${formatPrice(publicPricePerPerson)} / person`}
              </dd>
            </dl>
          </>
        )}

        {error && <div className="text-xs text-red-500">{error}</div>}

        <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
          {isAdmin && isPending && (
            <button type="button" disabled={busy} onClick={approveEvent} className="btn glass-success">
              {busy ? "…" : "Approve"}
            </button>
          )}
          {canDelete && (
            <button type="button" disabled={busy} onClick={remove} className="btn glass-danger">
              {isAdmin && isPending ? "Reject" : "Delete"}
            </button>
          )}
          {!isPrivateLocked && !isLockedByPending && !isPending && !event.bookedByMe && !isFull && canBook && emailVerified && !event.isPrivate && (
            <>
              <select
                aria-label="People"
                value={people}
                onChange={(e) => setPeople(Number(e.target.value))}
                className="field"
                style={{ width: "auto", height: 40 }}
              >
                {Array.from({ length: Math.min(seatsLeft, 10) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "seat" : "seats"}
                  </option>
                ))}
              </select>
              <button type="button" disabled={busy} onClick={book} className="btn glass-accent">
                {busy ? "…" : "Book"}
              </button>
            </>
          )}
          {!isPrivateLocked && event.bookedByMe && (
            <Link href="/profile" className="btn glass-success">
              You're in
            </Link>
          )}
          {!canBook && !event.isPrivate && (
            <Link href="/auth/signin" className="btn glass-accent">
              Sign in to book
            </Link>
          )}
        </div>
        </div>
        </Glass>
      </div>
    </div>
  );
}

function CreatedDialog({
  shareUrl,
  status,
  onClose,
}: {
  shareUrl: string | null;
  status: "PENDING" | "CONFIRMED";
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  return (
    <div
      className="fixed inset-0 z-40 bg-slate-900/15 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <Glass cornerRadius={28} padding="24px">
        <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          {status === "PENDING" ? "Submitted for approval" : "Event created"}
        </h2>
        {status === "PENDING" ? (
          <p className="text-sm text-[var(--muted)]">
            Your time slot is held. Once an admin approves the event, it'll appear on the public schedule (or be ready to share, if private).
          </p>
        ) : (
          <p className="text-sm text-[var(--muted)]">Your event is live on the schedule.</p>
        )}
        {shareUrl && (
          <>
            <p className="text-sm text-[var(--foreground)]">
              {status === "PENDING"
                ? "Save the invite link to share once it's approved:"
                : "Share this link with people you want to invite:"}
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="field flex-1 text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button type="button" onClick={copy} className="btn glass-accent">
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </>
        )}
        <div className="flex justify-end pt-2">
          <button type="button" onClick={onClose} className="btn btn-sm glass glass-hover">
            Done
          </button>
        </div>
        </div>
        </Glass>
      </div>
    </div>
  );
}
