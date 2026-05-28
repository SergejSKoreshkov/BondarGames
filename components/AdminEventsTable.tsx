"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatPrice } from "@/lib/format";

export type AdminEvent = {
  id: string;
  title: string;
  gameName: string;
  startsAt: string;
  durationMinutes: number;
  maxPeople: number;
  location: string | null;
  isPrivate: boolean;
  status: "PENDING" | "CONFIRMED";
  createdBy: { name: string | null; email: string };
  seatsTaken: number;
  reservations: { id: string; people: number; user: { name: string | null; email: string } }[];
};

export function AdminEventsTable({
  events,
  publicPricePerPerson,
  privatePricePerEvent,
}: {
  events: AdminEvent[];
  publicPricePerPerson: number;
  privatePricePerEvent: number;
}) {
  if (events.length === 0) {
    return (
      <div className="glass rounded-3xl p-10 text-center text-[var(--muted)]">
        No events yet.
      </div>
    );
  }
  return (
    <ul className="grid gap-3">
      {events.map((e) => (
        <AdminEventRow
          key={e.id}
          event={e}
          publicPricePerPerson={publicPricePerPerson}
          privatePricePerEvent={privatePricePerEvent}
        />
      ))}
    </ul>
  );
}

function AdminEventRow({
  event,
  publicPricePerPerson,
  privatePricePerEvent,
}: {
  event: AdminEvent;
  publicPricePerPerson: number;
  privatePricePerEvent: number;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function remove() {
    if (!confirm(`Delete "${event.title}"? This cancels all bookings.`)) return;
    setBusy(true);
    const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  async function removeReservation(id: string) {
    if (!confirm("Remove this booking?")) return;
    setBusy(true);
    const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  const priceLabel = event.isPrivate
    ? `${formatPrice(privatePricePerEvent)} flat`
    : `${formatPrice(publicPricePerPerson)}/person`;

  return (
    <li className="glass rounded-3xl p-5">
      <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <span>{formatDate(event.startsAt)}</span>
            <span
              className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium uppercase tracking-wide ${
                event.isPrivate
                  ? "glass-soft text-zinc-700"
                  : "bg-gradient-to-br from-indigo-500/15 to-violet-600/15 text-indigo-700 border border-white/40"
              }`}
            >
              {event.isPrivate ? "Private" : "Public"}
            </span>
            {event.status === "PENDING" && (
              <span className="glass-warn inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium uppercase tracking-wide">
                Pending
              </span>
            )}
          </div>
          <div className="font-semibold mt-0.5">{event.title}</div>
          <div className="text-sm text-[var(--muted)]">
            {event.gameName} · {event.seatsTaken}/{event.maxPeople} seats · {priceLabel}
            {event.location ? ` · ${event.location}` : ""} · hosted by{" "}
            {event.createdBy.name ?? event.createdBy.email}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="btn btn-sm glass glass-hover"
          >
            {open ? "Hide" : "Details"}
          </button>
          <button type="button" disabled={busy} onClick={remove} className="btn btn-sm glass-danger">
            Delete
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-4 border-t border-white/40 pt-4">
          {event.reservations.length === 0 ? (
            <div className="text-sm text-[var(--muted)]">No bookings yet.</div>
          ) : (
            <ul className="space-y-2">
              {event.reservations.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium truncate">
                      {r.user.name ?? r.user.email}
                    </span>{" "}
                    <span className="text-[var(--muted)]">— {r.people} seat(s)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeReservation(r.id)}
                    className="text-xs text-red-600 hover:underline shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
