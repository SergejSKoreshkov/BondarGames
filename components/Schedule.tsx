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

const HOUR_HEIGHT = 28; // px per hour; 24 * 28 = 672px total grid
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function fmtTime(d: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d);
}
function fmtHourLabel(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

export function Schedule({
  events,
  canBook,
  emailVerified,
  publicPricePerPerson,
  privatePricePerEvent,
  isAdmin,
  appUrl,
}: {
  events: ScheduleEvent[];
  canBook: boolean;
  emailVerified: boolean;
  publicPricePerPerson: number;
  privatePricePerEvent: number;
  isAdmin: boolean;
  appUrl: string;
}) {
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
    setCreatedResult({
      shareUrl: result.shareToken ? `${appUrl}/event/${result.shareToken}` : null,
      status: result.status,
    });
    setShowCreate(false);
  }

  const today = new Date();

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeekNav weekStart={weekStart} onChange={setWeekStart} />
        <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
          <div className="hidden sm:flex items-center gap-3">
            <Legend swatch="bg-gradient-to-br from-indigo-500 to-violet-600" label={`${formatPrice(publicPricePerPerson)} pp`} />
            <Legend swatch="bg-gradient-to-br from-zinc-400 to-zinc-500" label={`${formatPrice(privatePricePerEvent)} flat`} />
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

      {/* Week grid */}
      <div className="schedule-surface rounded-3xl overflow-hidden">
        {/* Day headers */}
        <div
          className="grid border-b border-white/50 text-xs bg-white/30"
          style={{ gridTemplateColumns: "48px repeat(7, minmax(0, 1fr))" }}
        >
          <div />
          {days.map((d) => {
            const isToday = sameDay(d, today);
            return (
              <div
                key={d.toISOString()}
                className={`px-1 py-2 text-center ${
                  isToday ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                }`}
              >
                <div className="uppercase tracking-wide text-[10px] sm:text-xs">
                  {new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d)}
                </div>
                <div
                  className={`text-sm font-semibold leading-tight ${
                    isToday
                      ? "inline-flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white mt-0.5 shadow-[0_4px_10px_-3px_rgba(67,56,202,0.5)]"
                      : ""
                  }`}
                >
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Body: hours column + 7 day columns */}
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: "48px repeat(7, minmax(0, 1fr))",
            height: HOUR_HEIGHT * 24,
          }}
        >
          {/* Time column */}
          <div className="relative border-r border-white/50">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 text-[10px] text-[var(--muted)] font-mono pr-2 text-right select-none"
                style={{ top: h * HOUR_HEIGHT - 6 }}
              >
                {fmtHourLabel(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, dayIdx) => (
            <DayColumn
              key={d.toISOString()}
              day={d}
              events={eventsThisWeek.filter((e) => sameDay(new Date(e.startsAt), d))}
              onEventClick={setActive}
              onEmptyClick={(hour) => {
                if (!(canBook && emailVerified)) return;
                const from = new Date(d);
                from.setHours(hour, 0, 0, 0);
                if (from.getTime() < Date.now()) return;
                openCreate(from);
              }}
              isLast={dayIdx === 6}
            />
          ))}

          <NowLine days={days} />
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

function DayColumn({
  day,
  events,
  onEventClick,
  onEmptyClick,
  isLast,
}: {
  day: Date;
  events: ScheduleEvent[];
  onEventClick: (e: ScheduleEvent) => void;
  onEmptyClick: (hour: number) => void;
  isLast: boolean;
}) {
  return (
    <div className={`relative ${isLast ? "" : "border-r border-white/50"}`}>
      {/* Hour rows (background grid) */}
      {HOURS.map((h) => (
        <button
          key={h}
          type="button"
          onClick={() => onEmptyClick(h)}
          className={`absolute left-0 right-0 hover:bg-white/40 transition-colors ${
            h === 0 ? "" : "border-t border-white/40"
          }`}
          style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          aria-label={`${fmtHourLabel(h)} on ${day.toDateString()}`}
        />
      ))}
      {/* Event blocks */}
      {events.map((e) => {
        const start = new Date(e.startsAt);
        const startMinutes = start.getHours() * 60 + start.getMinutes();
        const top = (startMinutes / 60) * HOUR_HEIGHT;
        const height = Math.max((e.durationMinutes / 60) * HOUR_HEIGHT - 2, 18);
        const pending = e.status === "PENDING";
        const blockClasses = pending
          ? "bg-gradient-to-br from-amber-200/90 to-amber-300/85 text-amber-900 border border-amber-400/65 border-dashed shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_4px_12px_-3px_rgba(180,83,9,0.25)] hover:from-amber-200 hover:to-amber-300"
          : e.isPrivate
            ? "bg-gradient-to-br from-zinc-400/85 to-zinc-500/90 text-white border border-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_-4px_rgba(15,23,42,0.28)] hover:brightness-105"
            : "bg-gradient-to-br from-indigo-500 to-violet-600 text-white border border-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_18px_-5px_rgba(79,70,229,0.5)] hover:brightness-110";
        const label = pending && !e.title ? "Pending" : e.isPrivate && !e.title ? "Private" : e.title;
        return (
          <button
            type="button"
            key={e.id}
            onClick={() => onEventClick(e)}
            className={`absolute left-1 right-1 rounded-[10px] text-[10px] sm:text-xs px-2 py-1 text-left overflow-hidden transition ${blockClasses}`}
            style={{ top, height }}
          >
            <div className="font-semibold truncate leading-tight">{label}</div>
            <div className="opacity-85 truncate leading-tight">{fmtTime(start)}</div>
          </button>
        );
      })}
    </div>
  );
}

function NowLine({ days }: { days: Date[] }) {
  const now = new Date();
  const today = days.findIndex((d) => sameDay(d, now));
  if (today === -1) return null;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const top = (minutes / 60) * HOUR_HEIGHT;
  return (
    <div
      className="absolute pointer-events-none z-10"
      style={{
        gridColumn: `${today + 2} / span 1`,
        gridRow: "1 / 2",
        top,
        left: 0,
        right: 0,
        height: 0,
      }}
    >
      <div className="relative h-0">
        <div className="absolute left-0 right-0 h-px bg-red-500/80" />
        <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
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
        <Glass cornerRadius={28} padding="24px" displacementScale={80} aberrationIntensity={2.4}>
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
        <Glass cornerRadius={28} padding="24px" displacementScale={75} aberrationIntensity={2.4}>
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
