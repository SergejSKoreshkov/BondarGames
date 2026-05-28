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
  pricePerPerson,
}: {
  prefillStart: Date | null;
  onClose: () => void;
  pricePerPerson: number;
}) {
  const router = useRouter();
  const initialStart =
    prefillStart ?? new Date(Date.now() + 60 * 60_000);
  const [title, setTitle] = useState("");
  const [gameName, setGameName] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(toLocalInputValue(initialStart));
  const [durationMinutes, setDuration] = useState(120);
  const [maxPeople, setMaxPeople] = useState(6);
  const [people, setPeople] = useState(1);
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
        durationMinutes: Number(durationMinutes),
        maxPeople: Number(maxPeople),
        location: location || null,
        people: Number(people),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to create event");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-3xl w-full max-w-md p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Host a game</h2>
            <p className="text-xs text-[var(--muted)] mt-1">
              {formatPrice(pricePerPerson)} per person · you take {people} seat{people === 1 ? "" : "s"}
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
          <Field label="Game">
            <input
              className="input"
              required
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
            />
          </Field>
          <Field label="Starts">
            <input
              type="datetime-local"
              className="input"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </Field>
          <Field label="Duration (min)">
            <input
              type="number"
              className="input"
              min={15}
              max={720}
              value={durationMinutes}
              onChange={(e) => setDuration(Number(e.target.value))}
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
