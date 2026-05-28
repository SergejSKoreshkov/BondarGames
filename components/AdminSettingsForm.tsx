"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSettingsForm({
  initialPublic,
  initialPrivate,
}: {
  initialPublic: number;
  initialPrivate: number;
}) {
  const [pub, setPub] = useState(initialPublic);
  const [priv, setPriv] = useState(initialPrivate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const dirty = pub !== initialPublic || priv !== initialPrivate;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicPricePerPerson: Number(pub), privatePricePerEvent: Number(priv) }),
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
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
      <label className="block">
        <span className="block text-xs font-medium text-[var(--muted)] mb-1.5">
          Public · per person (€)
        </span>
        <input
          type="number"
          min={0}
          value={pub}
          onChange={(e) => setPub(Number(e.target.value))}
          className="field"
        />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-[var(--muted)] mb-1.5">
          Private · flat per event (€)
        </span>
        <input
          type="number"
          min={0}
          value={priv}
          onChange={(e) => setPriv(Number(e.target.value))}
          className="field"
        />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy || !dirty} className="btn glass-accent">
          {busy ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-xs text-emerald-700">Saved.</span>}
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </form>
  );
}
