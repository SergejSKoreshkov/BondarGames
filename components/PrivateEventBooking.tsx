"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PrivateEventBooking({
  eventId,
  token,
  maxPeople,
  seatsTaken,
  alreadyBooked,
}: {
  eventId: string;
  token: string;
  maxPeople: number;
  seatsTaken: number;
  alreadyBooked: boolean;
}) {
  const [people, setPeople] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const seatsLeft = maxPeople - seatsTaken;

  if (alreadyBooked) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 text-center">
        You're booked into this event.
      </div>
    );
  }
  if (seatsLeft <= 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] px-5 py-4 text-sm text-[var(--muted)] text-center">
        This event is full.
      </div>
    );
  }

  async function book() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, people, shareToken: token }),
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
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center gap-3">
      <select
        aria-label="People"
        value={people}
        onChange={(e) => setPeople(Number(e.target.value))}
        className="h-11 px-3 rounded-full border border-[var(--border)] bg-white text-sm"
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
        className="flex-1 h-11 rounded-full bg-[var(--accent)] text-white text-sm font-medium disabled:opacity-50"
      >
        {busy ? "Booking…" : "Join the game"}
      </button>
      {error && <div className="basis-full text-xs text-red-500">{error}</div>}
    </div>
  );
}
