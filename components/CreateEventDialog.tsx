"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { snapTime } from "@/lib/time";
import { Glass } from "@/components/Glass";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";

function dateValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
function timeValue(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
  const [title, setTitle] = useState("");
  const [gameName, setGameName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(() =>
    dateValue(prefillStart ?? new Date(Date.now() + 60 * 60_000)),
  );
  const [startTime, setStartTime] = useState(() =>
    snapTime(timeValue(prefillStart ?? new Date(Date.now() + 60 * 60_000))),
  );
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

  const [dh, dm] = snapTime(duration).split(":").map((n) => parseInt(n, 10) || 0);
  const durationMinutes = dh * 60 + dm;
  const cost = isPrivate ? privatePricePerEvent : publicPricePerPerson * people;

  function startsAtISO() {
    const [y, mo, d] = startDate.split("-").map((n) => parseInt(n, 10));
    const [hh, mm] = snapTime(startTime).split(":").map((n) => parseInt(n, 10));
    return new Date(y, mo - 1, d, hh, mm, 0, 0).toISOString();
  }

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
        startsAt: startsAtISO(),
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
      className="fixed inset-0 z-40 bg-slate-900/15 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Glass cornerRadius={28} padding="24px">
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
            className="glass glass-hover h-8 w-8 rounded-full"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Title" full>
            <input
              className="field"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Game" full>
            <input
              className="field"
              required
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
            />
          </Field>
          <Field label="Date" full>
            <DatePicker value={startDate} onChange={setStartDate} min={new Date()} />
          </Field>
          <Field label="Start time">
            <TimePicker value={startTime} onChange={setStartTime} ariaLabel="Start time" />
          </Field>
          <Field label="Duration">
            <TimePicker value={duration} onChange={setDuration} maxHour={12} ariaLabel="Duration" />
          </Field>
          <Field label="Max people">
            <input
              type="number"
              className="field"
              min={1}
              max={100}
              value={maxPeople}
              onChange={(e) => setMaxPeople(Number(e.target.value))}
            />
          </Field>
          <Field label="Your seats">
            <input
              type="number"
              className="field"
              min={1}
              max={maxPeople}
              value={people}
              onChange={(e) => setPeople(Number(e.target.value))}
            />
          </Field>
          <Field label="Location" full>
            <input
              className="field"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </Field>
          <Field label="Description" full>
            <textarea
              className="field min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <label className="col-span-2 glass-soft rounded-2xl p-3 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="mt-1 accent-indigo-600"
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
            <button type="button" onClick={onClose} className="btn btn-sm glass glass-hover">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn glass-accent">
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
        </Glass>
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
