"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminEventForm() {
  const [title, setTitle] = useState("");
  const [gameName, setGameName] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDuration] = useState(120);
  const [maxPeople, setMaxPeople] = useState(6);
  const [pricePerPerson, setPrice] = useState(10);
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
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
        pricePerPerson: Number(pricePerPerson),
        location: location || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to create event");
      return;
    }
    setTitle("");
    setGameName("");
    setDescription("");
    setStartsAt("");
    setLocation("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Title" className="sm:col-span-2">
        <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Game">
        <input className="input" required value={gameName} onChange={(e) => setGameName(e.target.value)} />
      </Field>
      <Field label="Starts at">
        <input
          className="input"
          type="datetime-local"
          required
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
      </Field>
      <Field label="Duration (minutes)">
        <input
          className="input"
          type="number"
          min={15}
          max={720}
          value={durationMinutes}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
      </Field>
      <Field label="Location">
        <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
      </Field>
      <Field label="Max people">
        <input
          className="input"
          type="number"
          min={1}
          max={100}
          value={maxPeople}
          onChange={(e) => setMaxPeople(Number(e.target.value))}
        />
      </Field>
      <Field label="Price per person (€)">
        <input
          className="input"
          type="number"
          min={0}
          value={pricePerPerson}
          onChange={(e) => setPrice(Number(e.target.value))}
        />
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <textarea
          className="input min-h-[80px] py-3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      {error && <div className="text-xs text-red-500 sm:col-span-2">{error}</div>}
      <div className="sm:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="h-10 px-5 rounded-full bg-[var(--accent)] text-white text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Saving…" : "Create event"}
        </button>
      </div>
      <style>{`
        .input { width: 100%; height: 44px; padding: 0 16px; border-radius: 14px; border: 1px solid var(--border); background: white; font-size: 14px; outline: none; }
        .input:focus { border-color: var(--accent); }
      `}</style>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-xs font-medium text-[var(--muted)] mb-1.5">{label}</span>
      {children}
    </label>
  );
}
