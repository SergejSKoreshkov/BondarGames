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
      <div className="glass-success rounded-2xl px-5 py-4 text-sm text-center">
        You're booked into this event.
      </div>
    );
  }
  if (seatsLeft <= 0) {
    return (
      <div className="glass rounded-2xl px-5 py-4 text-sm text-[var(--muted)] text-center">
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
    <div className="glass rounded-3xl p-4 flex flex-wrap items-center gap-3">
      <select
        aria-label="People"
        value={people}
        onChange={(e) => setPeople(Number(e.target.value))}
        className="field"
        style={{ width: "auto", height: 44 }}
      >
        {Array.from({ length: Math.min(seatsLeft, 10) }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n} {n === 1 ? "seat" : "seats"}
          </option>
        ))}
      </select>
      <button type="button" disabled={busy} onClick={book} className="btn flex-1 glass-accent">
        {busy ? "Booking…" : "Join the game"}
      </button>
      {error && <div className="basis-full text-xs text-red-500">{error}</div>}
    </div>
  );
}
