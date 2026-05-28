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
  };
};

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function ReservationsList({
  reservations,
  pricePerPerson,
}: {
  reservations: Reservation[];
  pricePerPerson: number;
}) {
  if (reservations.length === 0) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--muted)]">
        You haven't booked any games yet.
      </div>
    );
  }
  return (
    <ul className="grid gap-3">
      {reservations.map((r) => (
        <Row key={r.id} r={r} pricePerPerson={pricePerPerson} />
      ))}
    </ul>
  );
}

function Row({ r, pricePerPerson }: { r: Reservation; pricePerPerson: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const startsAtMs = new Date(r.event.startsAt).getTime();
  const msUntil = startsAtMs - Date.now();
  const cancellable = msUntil > TWENTY_FOUR_HOURS_MS;
  const past = startsAtMs < Date.now();

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
    <li className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 flex items-center gap-5">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[var(--muted)]">{formatDate(r.event.startsAt)}</div>
        <div className="font-medium">{r.event.title}</div>
        <div className="text-sm text-[var(--muted)]">
          {r.event.gameName} · {r.people} {r.people === 1 ? "seat" : "seats"} ·{" "}
          {formatPrice(pricePerPerson * r.people)}
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
          className="h-9 px-4 rounded-full border border-[var(--border)] text-sm hover:bg-black/5 disabled:opacity-50"
        >
          {busy ? "…" : "Cancel"}
        </button>
      ) : (
        <span className="text-xs text-amber-600 max-w-[120px] text-right">
          Within 24h — cancellation closed
        </span>
      )}
    </li>
  );
}
