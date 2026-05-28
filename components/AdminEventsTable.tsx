"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatPrice } from "@/lib/format";

type AdminEvent = {
  id: string;
  title: string;
  gameName: string;
  startsAt: string;
  maxPeople: number;
  pricePerPerson: number;
  location: string | null;
  seatsTaken: number;
  reservations: { id: string; people: number; user: { name: string | null; email: string } }[];
};

export function AdminEventsTable({ events }: { events: AdminEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--muted)]">
        No events yet.
      </div>
    );
  }
  return (
    <ul className="grid gap-3">
      {events.map((e) => (
        <AdminEventRow key={e.id} event={e} />
      ))}
    </ul>
  );
}

function AdminEventRow({ event }: { event: AdminEvent }) {
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

  return (
    <li className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--muted)]">{formatDate(event.startsAt)}</div>
          <div className="font-medium">{event.title}</div>
          <div className="text-sm text-[var(--muted)]">
            {event.gameName} · {event.seatsTaken}/{event.maxPeople} booked ·{" "}
            {formatPrice(event.pricePerPerson)}/person
            {event.location ? ` · ${event.location}` : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="h-9 px-4 rounded-full border border-[var(--border)] text-sm hover:bg-black/5"
        >
          {open ? "Hide" : "Details"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          className="h-9 px-4 rounded-full bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
      {open && (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          {event.reservations.length === 0 ? (
            <div className="text-sm text-[var(--muted)]">No bookings yet.</div>
          ) : (
            <ul className="space-y-2">
              {event.reservations.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <span className="font-medium">{r.user.name ?? r.user.email}</span>{" "}
                    <span className="text-[var(--muted)]">— {r.people} seat(s)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeReservation(r.id)}
                    className="text-xs text-red-600 hover:underline"
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
