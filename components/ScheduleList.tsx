"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate, formatPrice } from "@/lib/format";

type Event = {
  id: string;
  title: string;
  description: string | null;
  gameName: string;
  startsAt: string;
  durationMinutes: number;
  maxPeople: number;
  pricePerPerson: number;
  location: string | null;
  seatsTaken: number;
  bookedByMe: boolean;
};

export function ScheduleList({
  events,
  canBook,
  emailVerified,
}: {
  events: Event[];
  canBook: boolean;
  emailVerified: boolean;
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--muted)]">
        No games scheduled yet. Check back soon.
      </div>
    );
  }
  return (
    <ul className="grid gap-3">
      {events.map((e) => (
        <EventRow key={e.id} event={e} canBook={canBook} emailVerified={emailVerified} />
      ))}
    </ul>
  );
}

function EventRow({
  event,
  canBook,
  emailVerified,
}: {
  event: Event;
  canBook: boolean;
  emailVerified: boolean;
}) {
  const [people, setPeople] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const seatsLeft = event.maxPeople - event.seatsTaken;
  const isFull = seatsLeft <= 0;

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

  return (
    <li className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <span>{formatDate(event.startsAt)}</span>
          <span>·</span>
          <span>{event.durationMinutes} min</span>
          {event.location && (
            <>
              <span>·</span>
              <span className="truncate">{event.location}</span>
            </>
          )}
        </div>
        <div className="mt-1 font-medium text-lg leading-tight">{event.title}</div>
        <div className="text-sm text-[var(--muted)]">{event.gameName}</div>
        {event.description && (
          <p className="mt-2 text-sm text-[var(--muted)] line-clamp-2">{event.description}</p>
        )}
      </div>

      <div className="flex sm:flex-col items-end gap-2 sm:gap-1 text-right">
        <div className="text-lg font-semibold leading-none">
          {formatPrice(event.pricePerPerson)}
          <span className="ml-1 text-xs text-[var(--muted)] font-normal">/ person</span>
        </div>
        <div
          className={`text-xs ${isFull ? "text-red-500" : "text-[var(--muted)]"}`}
        >
          {isFull ? "Full" : `${seatsLeft} seats left`}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {event.bookedByMe ? (
          <Link
            href="/profile"
            className="px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium"
          >
            Booked
          </Link>
        ) : !canBook ? (
          <Link
            href="/auth/signin"
            className="px-4 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-medium"
          >
            Sign in to book
          </Link>
        ) : !emailVerified ? (
          <span className="text-xs text-amber-600 max-w-[160px] text-right">
            Verify your email to book
          </span>
        ) : isFull ? null : (
          <>
            <select
              aria-label="People"
              value={people}
              onChange={(e) => setPeople(Number(e.target.value))}
              className="h-9 px-2 rounded-full border border-[var(--border)] bg-white text-sm"
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
              className="h-9 px-4 rounded-full bg-[var(--accent)] text-white text-sm font-medium disabled:opacity-50"
            >
              {busy ? "…" : "Book"}
            </button>
          </>
        )}
      </div>
      {error && (
        <div className="basis-full text-xs text-red-500">{error}</div>
      )}
    </li>
  );
}
