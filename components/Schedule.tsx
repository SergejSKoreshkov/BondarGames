"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { CreateEventDialog } from "@/components/CreateEventDialog";

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
  shareToken?: string | null;
  createdBy: { id: string; name: string | null; email: string } | null;
  seatsTaken: number;
  bookedByMe?: boolean;
  isMine?: boolean;
};

const HOUR_PX_DESKTOP = 80; // px per hour on the horizontal timeline
const MIN_PX_PER_MIN_MOBILE = 1.2; // px per minute on the vertical mobile timeline
const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;

type DayBucket = { dayKey: string; dayLabel: string; date: Date; events: ScheduleEvent[] };

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtTime(d: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d);
}

function bucketise(events: ScheduleEvent[]): DayBucket[] {
  const byDay = new Map<string, ScheduleEvent[]>();
  for (const e of events) {
    const key = dayKey(new Date(e.startsAt));
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }
  const out: DayBucket[] = [];
  for (const [key, evs] of byDay) {
    evs.sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
    const date = startOfDay(new Date(evs[0].startsAt));
    out.push({
      dayKey: key,
      date,
      dayLabel: new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(date),
      events: evs,
    });
  }
  out.sort((a, b) => +a.date - +b.date);
  return out;
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
  const buckets = useMemo(() => bucketise(events), [events]);
  const [showCreate, setShowCreate] = useState(false);
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);
  const [prefillFrom, setPrefillFrom] = useState<Date | null>(null);

  function openCreate(from?: Date) {
    setPrefillFrom(from ?? null);
    setShowCreate(true);
  }

  function onCreated(shareToken: string | null) {
    if (shareToken) {
      setCreatedShareUrl(`${appUrl}/event/${shareToken}`);
    }
    setShowCreate(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm text-[var(--muted)]">
          {events.length === 0 ? "Nothing scheduled yet." : `${events.length} upcoming`}
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <Legend swatch="bg-[var(--accent)]" label={`Public · ${formatPrice(publicPricePerPerson)}/pp`} />
          <Legend swatch="bg-zinc-400" label={`Private · ${formatPrice(privatePricePerEvent)} flat`} />
          {canBook && emailVerified ? (
            <button
              type="button"
              onClick={() => openCreate()}
              className="h-9 px-4 rounded-full bg-[var(--accent)] text-white text-sm font-medium"
            >
              Host a game
            </button>
          ) : canBook ? (
            <span className="text-amber-600">Verify email to host</span>
          ) : (
            <Link
              href="/auth/signin"
              className="h-9 px-4 leading-9 rounded-full bg-[var(--accent)] text-white text-sm font-medium"
            >
              Sign in to host
            </Link>
          )}
        </div>
      </div>

      {buckets.length === 0 ? (
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--muted)]">
          The timetable is empty.{" "}
          {canBook && emailVerified ? "Be the first to host a game." : "Sign in and host the first one."}
        </div>
      ) : (
        <ul className="space-y-6">
          {buckets.map((b) => (
            <DayTimeline
              key={b.dayKey}
              bucket={b}
              canBook={canBook}
              emailVerified={emailVerified}
              isAdmin={isAdmin}
              publicPricePerPerson={publicPricePerPerson}
              onHostAt={openCreate}
            />
          ))}
        </ul>
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

      {createdShareUrl && (
        <ShareCreatedDialog url={createdShareUrl} onClose={() => setCreatedShareUrl(null)} />
      )}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${swatch}`} />
      {label}
    </span>
  );
}

function DayTimeline({
  bucket,
  canBook,
  emailVerified,
  isAdmin,
  publicPricePerPerson,
  onHostAt,
}: {
  bucket: DayBucket;
  canBook: boolean;
  emailVerified: boolean;
  isAdmin: boolean;
  publicPricePerPerson: number;
  onHostAt: (from: Date) => void;
}) {
  const [active, setActive] = useState<ScheduleEvent | null>(null);
  const dayStart = startOfDay(bucket.date);
  const hoursInDay = DAY_END_HOUR - DAY_START_HOUR;

  return (
    <li className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
          {bucket.dayLabel}
        </div>
        <div className="text-xs text-[var(--muted)] hidden sm:block">
          Tap a block for details
        </div>
      </div>

      {/* Desktop / tablet: horizontal timeline */}
      <div className="hidden sm:block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 overflow-x-auto">
        <div
          className="relative"
          style={{
            width: hoursInDay * HOUR_PX_DESKTOP,
            height: 80,
          }}
        >
          {/* Hour grid */}
          {Array.from({ length: hoursInDay + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-[var(--border)] text-[10px] text-[var(--muted)] font-mono"
              style={{ left: i * HOUR_PX_DESKTOP }}
            >
              <span className="absolute -top-3 -translate-x-1/2 bg-[var(--surface)] px-1">
                {String(i + DAY_START_HOUR).padStart(2, "0")}
              </span>
            </div>
          ))}
          {/* Now line */}
          <NowLine dayStart={dayStart} pxPerMin={HOUR_PX_DESKTOP / 60} orientation="vertical" />
          {/* Events */}
          {bucket.events.map((e) => {
            const start = new Date(e.startsAt);
            const minutesFromDayStart = (start.getTime() - dayStart.getTime()) / 60_000;
            const left = (minutesFromDayStart / 60) * HOUR_PX_DESKTOP;
            const width = (e.durationMinutes / 60) * HOUR_PX_DESKTOP;
            return (
              <button
                type="button"
                key={e.id}
                onClick={() => setActive(e)}
                className={`absolute top-2 bottom-2 rounded-xl text-left px-3 py-2 text-white text-xs overflow-hidden transition-shadow ${
                  e.isPrivate
                    ? "bg-zinc-500/90 hover:bg-zinc-500"
                    : "bg-[var(--accent)] hover:opacity-90"
                }`}
                style={{ left, width: Math.max(width, 36) }}
              >
                <div className="font-medium truncate">
                  {e.isPrivate && !e.title ? "Private" : e.title}
                </div>
                <div className="opacity-80 truncate">{fmtTime(start)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile: vertical compact timeline */}
      <div className="sm:hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
        <ul className="space-y-2">
          {bucket.events.map((e) => {
            const start = new Date(e.startsAt);
            const end = new Date(start.getTime() + e.durationMinutes * 60_000);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setActive(e)}
                  className={`w-full text-left rounded-xl px-3 py-2 flex items-center gap-3 ${
                    e.isPrivate ? "bg-zinc-100" : "bg-[var(--accent)]/5 border border-[var(--accent)]/15"
                  }`}
                >
                  <span
                    className={`block w-1 self-stretch rounded-full ${
                      e.isPrivate ? "bg-zinc-400" : "bg-[var(--accent)]"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[var(--muted)] font-mono">
                      {fmtTime(start)} – {fmtTime(end)}
                    </div>
                    <div className="text-sm font-medium truncate">
                      {e.isPrivate && !e.title ? "Private booking" : e.title}
                    </div>
                    {!e.isPrivate && e.gameName && (
                      <div className="text-xs text-[var(--muted)] truncate">{e.gameName}</div>
                    )}
                  </div>
                  <span className="text-xs text-[var(--muted)] shrink-0">
                    {e.seatsTaken}/{e.maxPeople}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {active && (
        <EventDetailDialog
          event={active}
          onClose={() => setActive(null)}
          canBook={canBook}
          emailVerified={emailVerified}
          isAdmin={isAdmin}
          publicPricePerPerson={publicPricePerPerson}
        />
      )}
    </li>
  );
}

function NowLine({
  dayStart,
  pxPerMin,
  orientation,
}: {
  dayStart: Date;
  pxPerMin: number;
  orientation: "vertical" | "horizontal";
}) {
  const now = Date.now();
  const startMs = dayStart.getTime();
  const endMs = startMs + 24 * 3600_000;
  if (now < startMs || now > endMs) return null;
  const minutes = (now - startMs) / 60_000;
  const pos = minutes * pxPerMin;
  if (orientation === "vertical") {
    return (
      <div
        className="absolute top-0 bottom-0 w-px bg-red-500/70"
        style={{ left: pos }}
        aria-hidden
      />
    );
  }
  return (
    <div
      className="absolute left-0 right-0 h-px bg-red-500/70"
      style={{ top: pos }}
      aria-hidden
    />
  );
}

function EventDetailDialog({
  event,
  onClose,
  canBook,
  emailVerified,
  isAdmin,
  publicPricePerPerson,
}: {
  event: ScheduleEvent;
  onClose: () => void;
  canBook: boolean;
  emailVerified: boolean;
  isAdmin: boolean;
  publicPricePerPerson: number;
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
  const isPrivateLocked = event.isPrivate && !event.isMine && !isAdmin;

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
      className="fixed inset-0 z-40 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-[var(--muted)] font-mono">
              {fmtTime(startsAt)} – {fmtTime(endsAt)}
            </div>
            <h2 className="text-lg font-semibold truncate mt-0.5">
              {isPrivateLocked ? "Private booking" : event.title}
            </h2>
            {!isPrivateLocked && event.gameName && (
              <div className="text-sm text-[var(--muted)]">{event.gameName}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 shrink-0 rounded-full hover:bg-black/5"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {isPrivateLocked ? (
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
              {!event.isPrivate && (
                <>
                  <dt className="text-[var(--muted)]">Price</dt>
                  <dd>{formatPrice(publicPricePerPerson)} / person</dd>
                </>
              )}
            </dl>
          </>
        )}

        {error && <div className="text-xs text-red-500">{error}</div>}

        <div className="flex items-center justify-end gap-2 pt-2">
          {canDelete && (
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="h-10 px-4 rounded-full bg-red-50 text-red-600 text-sm font-medium disabled:opacity-50"
            >
              Delete
            </button>
          )}
          {!isPrivateLocked && !event.bookedByMe && !isFull && canBook && emailVerified && !event.isPrivate && (
            <>
              <select
                aria-label="People"
                value={people}
                onChange={(e) => setPeople(Number(e.target.value))}
                className="h-10 px-3 rounded-full border border-[var(--border)] bg-white text-sm"
              >
                {Array.from({ length: Math.min(seatsLeft, 10) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "seat" : "seats"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy}
                onClick={book}
                className="h-10 px-5 rounded-full bg-[var(--accent)] text-white text-sm font-medium disabled:opacity-50"
              >
                {busy ? "…" : "Book"}
              </button>
            </>
          )}
          {!isPrivateLocked && event.bookedByMe && (
            <Link
              href="/profile"
              className="h-10 px-4 leading-10 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium"
            >
              You're in
            </Link>
          )}
          {!canBook && !event.isPrivate && (
            <Link
              href="/auth/signin"
              className="h-10 px-4 leading-10 rounded-full bg-[var(--accent)] text-white text-sm font-medium"
            >
              Sign in to book
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ShareCreatedDialog({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  return (
    <div
      className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-3xl w-full max-w-sm p-6 shadow-xl space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Private event created</h2>
        <p className="text-sm text-[var(--muted)]">
          Share this link with people you want to invite. Only they can see details and book seats.
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={url}
            className="flex-1 h-10 px-3 rounded-full border border-[var(--border)] bg-white text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={copy}
            className="h-10 px-4 rounded-full bg-[var(--accent)] text-white text-sm font-medium"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-full text-sm hover:bg-black/5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
