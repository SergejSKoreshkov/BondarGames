"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";

function toLocalInputValue(d: Date) {
  const tzOffset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function CreateEventDialog({
  prefillStart,
  onClose,
  onCreated,
  publicPricePerPerson,
  privatePricePerEvent,
}: {
  prefillStart: Date | null;
  onClose: () => void;
  onCreated: (result: { shareToken: string | null; status: "PENDING" | "CONFIRMED" }) => void;
  publicPricePerPerson: number;
  privatePricePerEvent: number;
}) {
  const router = useRouter();
  const initialStart = prefillStart ?? new Date(Date.now() + 60 * 60_000);
  const [title, setTitle] = useState("");
  const [gameName, setGameName] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(toLocalInputValue(initialStart));
  const [duration, setDuration] = useState("02:00");
  const [maxPeople, setMaxPeople] = useState(6);
  const [people, setPeople] = useState(1);
  const [location, setLocation] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [dh, dm] = duration.split(":").map((n) => parseInt(n, 10) || 0);
  const durationMinutes = dh * 60 + dm;
  const cost = isPrivate ? privatePricePerEvent : publicPricePerPerson * people;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (durationMinutes < 15) {
      setError("Duration must be at least 15 minutes");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        gameName,
        description: description || null,
        startsAt: new Date(startsAt).toISOString(),
        durationMinutes,
        maxPeople: Number(maxPeople),
        location: location || null,
        people: Number(people),
        isPrivate,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to create event");
      return;
    }
    const body = (await res.json().catch(() => ({}))) as {
      shareToken?: string | null;
      status?: "PENDING" | "CONFIRMED";
    };
    onCreated({
      shareToken: body.shareToken ?? null,
      status: body.status ?? "PENDING",
    });
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6 shadow-xl max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Host a game</h2>
            <p className="text-xs text-[var(--muted)] mt-1">
              {isPrivate
                ? `Private · ${formatPrice(privatePricePerEvent)} flat`
                : `${formatPrice(publicPricePerPerson)}/pp · total ${formatPrice(cost)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-black/5"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Title" full>
            <input
              className="input"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Game" full>
            <input
              className="input"
              required
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
            />
          </Field>
          <Field label="Starts" full>
            <input
              type="datetime-local"
              className="input"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </Field>
          <Field label="Duration (hh:mm)" full>
            <input
              type="time"
              step={300}
              className="input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </Field>
          <Field label="Max people">
            <input
              type="number"
              className="input"
              min={1}
              max={100}
              value={maxPeople}
              onChange={(e) => setMaxPeople(Number(e.target.value))}
            />
          </Field>
          <Field label="Your seats">
            <input
              type="number"
              className="input"
              min={1}
              max={maxPeople}
              value={people}
              onChange={(e) => setPeople(Number(e.target.value))}
            />
          </Field>
          <Field label="Location" full>
            <input
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </Field>
          <Field label="Description" full>
            <textarea
              className="input min-h-[60px] py-3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <label className="col-span-2 flex items-start gap-3 rounded-2xl border border-[var(--border)] p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm">
              <span className="font-medium block">Private event</span>
              <span className="text-[var(--muted)] text-xs">
                Slot shows as busy to everyone, but only people with the invite link can see details and book.
                Flat fee of {formatPrice(privatePricePerEvent)} (not per person).
              </span>
            </span>
          </label>

          {error && <div className="col-span-2 text-xs text-red-500">{error}</div>}
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-full text-sm hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="h-10 px-5 rounded-full bg-[var(--accent)] text-white text-sm font-medium disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
        <style>{`
          .input { width: 100%; height: 40px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--border); background: white; font-size: 14px; outline: none; }
          .input:focus { border-color: var(--accent); }
        `}</style>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <span className="block text-xs font-medium text-[var(--muted)] mb-1">{label}</span>
      {children}
    </label>
  );
}
