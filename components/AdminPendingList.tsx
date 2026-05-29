"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import type { AdminEvent } from "@/components/AdminEventsTable";

export function AdminPendingList({ events }: { events: AdminEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="glass rounded-3xl p-6 text-sm text-[var(--muted)]">
        Nothing waiting for approval.
      </div>
    );
  }
  return (
    <ul className="grid gap-3">
      {events.map((e) => (
        <PendingRow key={e.id} event={e} />
      ))}
    </ul>
  );
}

function PendingRow({ event }: { event: AdminEvent }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function approve() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/events/${event.id}/confirm`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Could not approve");
      return;
    }
    router.refresh();
  }

  async function reject() {
    if (!confirm(`Reject "${event.title}" and remove all its bookings?`)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Could not reject");
      return;
    }
    router.refresh();
  }

  const durationHours = Math.floor(event.durationMinutes / 60);
  const durationMins = event.durationMinutes % 60;

  return (
    <li className="glass-warn rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs">
          <span>{formatDate(event.startsAt)}</span>
          <span className="glass-soft inline-flex h-5 px-2 items-center rounded-full text-[10px] font-medium uppercase tracking-wide text-zinc-700">
            {event.isPrivate ? "Private" : "Public"}
          </span>
        </div>
        <div className="font-semibold mt-0.5 text-[var(--foreground)]">{event.title}</div>
        <div className="text-sm text-[var(--foreground)]/70">
          {event.gameName} · {durationHours}h{durationMins ? ` ${durationMins}m` : ""} ·{" "}
          {event.maxPeople} max
          {event.location ? ` · ${event.location}` : ""}
        </div>
        <div className="text-xs text-[var(--foreground)]/70 mt-1">
          Host: <span className="text-[var(--foreground)]/90">{event.createdBy.name ?? "—"}</span>{" "}
          <a
            href={`mailto:${event.createdBy.email}`}
            className="text-indigo-700 hover:underline break-all"
          >
            {event.createdBy.email}
          </a>
        </div>
        {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={`mailto:${event.createdBy.email}?subject=${encodeURIComponent(
            `BondarGames — ${event.title}`,
          )}`}
          className="btn btn-sm glass glass-hover"
        >
          Contact host
        </a>
        <button type="button" onClick={reject} disabled={busy} className="btn btn-sm glass-danger">
          Reject
        </button>
        <button type="button" onClick={approve} disabled={busy} className="btn btn-sm glass-success">
          {busy ? "…" : "Approve"}
        </button>
      </div>
    </li>
  );
}
