"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSettingsForm({ initial }: { initial: number }) {
  const [price, setPrice] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pricePerPerson: Number(price) }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to save");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-3">
      <label className="block flex-1 max-w-[200px]">
        <span className="block text-xs font-medium text-[var(--muted)] mb-1.5">
          Price per person (€)
        </span>
        <input
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="w-full h-11 px-3 rounded-2xl border border-[var(--border)] bg-white text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>
      <button
        type="submit"
        disabled={busy || price === initial}
        className="h-11 px-5 rounded-full bg-[var(--accent)] text-white text-sm font-medium disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      {saved && <span className="text-xs text-emerald-600">Saved.</span>}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </form>
  );
}
