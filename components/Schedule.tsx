"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { CreateEventDialog } from "@/components/CreateEventDialog";

export type ScheduleEvent = {
  id: string;
  title: string;
  description: string | null;
  gameName: string;
  startsAt: string;
  durationMinutes: number;
  maxPeople: number;
  location: string | null;
  createdBy: { id: string; name: string | null; email: string };
  seatsTaken: number;
  bookedByMe: boolean;
  isMine: boolean;
};

type DayBucket = {
  dayLabel: string;
  dayKey: string;
  rows: Row[];
};
type Row =
  | { kind: "event"; event: ScheduleEvent }
  | { kind: "free"; from: Date; to: Date };

const MIN_FREE_GAP_MINUTES = 30;

function bucketise(events: ScheduleEvent[]): DayBucket[] {
  const byDay = new Map<string, ScheduleEvent[]>();
  for (const e of events) {
    const d = new Date(e.startsAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }
  const buckets: DayBucket[] = [];
  for (const [key, dayEvents] of byDay) {
    dayEvents.sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
    const rows: Row[] = [];
    for (let i = 0; i < dayEvents.length; i++) {
      const ev = dayEvents[i];
      const prev = dayEvents[i - 1];
      if (prev) {
        const prevEnd = new Date(
          new Date(prev.startsAt).getTime() + prev.durationMinutes * 60_000,
        );
        const thisStart = new Date(ev.startsAt);
        const gapMin = (thisStart.getTime() - prevEnd.getTime()) / 60_000;
        if (gapMin >= MIN_FREE_GAP_MINUTES) {
          rows.push({ kind: "free", from: prevEnd, to: thisStart });
        }
      }
      rows.push({ kind: "event", event: ev });
    }
    const sample = new Date(dayEvents[0].startsAt);
    buckets.push({
      dayKey: key,
      dayLabel: new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(sample),
      rows,
    });
  }
  return buckets;
}

function fmtTime(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(dt);
}

export function Schedule({
  events,
  canBook,
  emailVerified,
  pricePerPerson,
  isAdmin,
}: {
  events: ScheduleEvent[];
  canBook: boolean;
  emailVerified: boolean;
  pricePerPerson: number;
  isAdmin: boolean;
}) {
  const buckets = useMemo(() => bucketise(events), [events]);
  const [showCreate, setShowCreate] = useState(false);
  const [prefillFrom, setPrefillFrom] = useState<Date | null>(null);

  function openCreate(from?: Date) {
    setPrefillFrom(from ?? null);
    setShowCreate(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--muted)]">
          {events.length === 0 ? "Nothing scheduled yet." : `${events.length} upcoming`}
        </div>
        {canBook && emailVerified && (
          <button
            type="button"
            onClick={() => openCreate()}
            className="h-9 px-4 rounded-full bg-[var(--accent)] text-white text-sm font-medium"
          >
            Host a game
          </button>
        )}
        {canBook && !emailVerified && (
          <span className="text-xs text-amber-600">Verify your email to host or book</span>
        )}
        {!canBook && (
          <Link
            href="/auth/signin"
            className="h-9 px-4 leading-9 rounded-full bg-[var(--accent)] text-white text-sm font-medium"
          >
            Sign in to host
          </Link>
        )}
      </div>

      {buckets.length === 0 ? (
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--muted)]">
          The timetable is empty.{" "}
          {canBook && emailVerified ? "Be the first to host a game." : "Sign in and host the first one."}
        </div>
      ) : (
        <ul className="space-y-8">
          {buckets.map((b) => (
            <li key={b.dayKey} className="space-y-3">
              <div className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">
                {b.dayLabel}
              </div>
              <ul className="grid gap-2">
                {b.rows.map((r, i) =>
                  r.kind === "free" ? (
                    <FreeRow
                      key={`free-${i}`}
                      from={r.from}
                      to={r.to}
                      canCreate={canBook && emailVerified}
                      onCreate={() => openCreate(r.from)}
                    />
                  ) : (
                    <EventRow
                      key={r.event.id}
                      event={r.event}
                      canBook={canBook}
                      emailVerified={emailVerified}
                      pricePerPerson={pricePerPerson}
                      isAdmin={isAdmin}
                    />
                  ),
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <CreateEventDialog
          prefillStart={prefillFrom}
          onClose={() => setShowCreate(false)}
          pricePerPerson={pricePerPerson}
        />
      )}
    </div>
  );
}

function FreeRow({
  from,
  to,
  canCreate,
  onCreate,
}: {
  from: Date;
  to: Date;
  canCreate: boolean;
  onCreate: () => void;
}) {
  const minutes = Math.round((to.getTime() - from.getTime()) / 60_000);
  return (
    <li className="rounded-2xl border border-dashed border-[var(--border)] bg-transparent px-5 py-3 flex items-center gap-4 text-sm">
      <span className="font-mono text-xs text-[var(--muted)] w-28 shrink-0">
        {fmtTime(from)} – {fmtTime(to)}
      </span>
      <span className="flex-1 text-[var(--muted)]">
        Free · {minutes} min available
      </span>
      {canCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="h-8 px-3 rounded-full text-xs font-medium hover:bg-black/5"
        >
          + Host here
        </button>
      )}
    </li>
  );
}

function EventRow({
  event,
  canBook,
  emailVerified,
  pricePerPerson,
  isAdmin,
}: {
  event: ScheduleEvent;
  canBook: boolean;
  emailVerified: boolean;
  pricePerPerson: number;
  isAdmin: boolean;
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
  const canDelete = isAdmin || (event.isMine && msUntil >= 24 * 60 * 60 * 1000);

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
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete "${event.title}"?`)) return;
    setBusy(true);
    const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Could not delete");
      return;
    }
    router.refresh();
  }

  return (
    <li className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <span className="font-mono text-xs text-[var(--muted)] w-28 shrink-0">
        {fmtTime(startsAt)} – {fmtTime(endsAt)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-medium leading-tight">{event.title}</div>
        <div className="text-sm text-[var(--muted)] truncate">
          {event.gameName}
          {event.location ? ` · ${event.location}` : ""} · hosted by{" "}
          {event.createdBy.name ?? event.createdBy.email.split("@")[0]}
        </div>
        {event.description && (
          <p className="mt-1 text-xs text-[var(--muted)] line-clamp-1">{event.description}</p>
        )}
        {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <div className="text-sm font-medium">
            {formatPrice(pricePerPerson)}
            <span className="text-xs text-[var(--muted)] font-normal"> /pp</span>
          </div>
          <div className={`text-xs ${isFull ? "text-red-500" : "text-[var(--muted)]"}`}>
            {isFull ? "Full" : `${seatsLeft}/${event.maxPeople} seats`}
          </div>
        </div>
        {event.bookedByMe ? (
          <Link
            href="/profile"
            className="h-9 px-3 leading-9 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium"
          >
            Booked
          </Link>
        ) : !canBook ? (
          <Link
            href="/auth/signin"
            className="h-9 px-3 leading-9 rounded-full bg-[var(--accent)] text-white text-xs font-medium"
          >
            Sign in
          </Link>
        ) : !emailVerified ? null : isFull ? null : (
          <>
            <select
              aria-label="People"
              value={people}
              onChange={(e) => setPeople(Number(e.target.value))}
              className="h-9 px-2 rounded-full border border-[var(--border)] bg-white text-xs"
            >
              {Array.from({ length: Math.min(seatsLeft, 10) }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={book}
              className="h-9 px-4 rounded-full bg-[var(--accent)] text-white text-xs font-medium disabled:opacity-50"
            >
              {busy ? "…" : "Book"}
            </button>
          </>
        )}
        {canDelete && (
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="h-9 w-9 rounded-full text-red-600 hover:bg-red-50 disabled:opacity-50"
            title="Delete event"
          >
            ×
          </button>
        )}
      </div>
    </li>
  );
}
