"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatPrice } from "@/lib/format";

type Reservation = {
  id: string;
  people: number;
  event: {
    id: string;
    title: string;
    gameName: string;
    startsAt: string;
    location: string | null;
    isPrivate: boolean;
    status: "PENDING" | "CONFIRMED";
  };
};

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function ReservationsList({
  reservations,
  publicPricePerPerson,
  privatePricePerEvent,
}: {
  reservations: Reservation[];
  publicPricePerPerson: number;
  privatePricePerEvent: number;
}) {
  if (reservations.length === 0) {
    return (
      <div className="glass rounded-3xl p-10 text-center text-[var(--muted)]">
        You haven't booked any games yet.
      </div>
    );
  }
  return (
    <ul className="grid gap-3">
      {reservations.map((r) => (
        <Row
          key={r.id}
          r={r}
          publicPricePerPerson={publicPricePerPerson}
          privatePricePerEvent={privatePricePerEvent}
        />
      ))}
    </ul>
  );
}

function Row({
  r,
  publicPricePerPerson,
  privatePricePerEvent,
}: {
  r: Reservation;
  publicPricePerPerson: number;
  privatePricePerEvent: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const startsAtMs = new Date(r.event.startsAt).getTime();
  const msUntil = startsAtMs - Date.now();
  const cancellable = msUntil > TWENTY_FOUR_HOURS_MS;
  const past = startsAtMs < Date.now();
  const total = r.event.isPrivate ? privatePricePerEvent : publicPricePerPerson * r.people;

  async function cancel() {
    if (!confirm("Cancel this booking?")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/reservations/${r.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Could not cancel");
      return;
    }
    router.refresh();
  }

  return (
    <li className="glass rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <span>{formatDate(r.event.startsAt)}</span>
          {r.event.isPrivate && (
            <span className="glass-soft inline-flex h-5 px-2 items-center rounded-full text-zinc-700 text-[10px] font-medium uppercase tracking-wide">
              Private
            </span>
          )}
          {r.event.status === "PENDING" && (
            <span className="glass-warn inline-flex h-5 px-2 items-center rounded-full text-[10px] font-medium uppercase tracking-wide">
              Pending
            </span>
          )}
        </div>
        <div className="font-semibold mt-0.5">{r.event.title}</div>
        <div className="text-sm text-[var(--muted)]">
          {r.event.gameName} · {r.people} {r.people === 1 ? "seat" : "seats"} · {formatPrice(total)}
          {r.event.isPrivate && " flat"}
        </div>
        {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
      </div>
      {past ? (
        <span className="text-xs text-[var(--muted)]">Past</span>
      ) : cancellable ? (
        <button
          type="button"
          disabled={busy}
          onClick={cancel}
          className="btn btn-sm glass glass-hover self-start sm:self-auto"
        >
          {busy ? "…" : "Cancel"}
        </button>
      ) : (
        <span className="text-xs text-amber-700 sm:max-w-[120px] sm:text-right">
          Within 24h — cancellation closed
        </span>
      )}
    </li>
  );
}
