"use client";

import { useState } from "react";

export function InviteLink({ token, compact = false }: { token: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined" ? `${window.location.origin}/event/${token}` : `/event/${token}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className={compact ? "space-y-1" : "glass-soft rounded-2xl p-3 space-y-1.5"}>
      {!compact && <div className="text-xs font-medium text-[var(--muted)]">Invite link</div>}
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="field flex-1 text-xs"
          style={{ height: 34 }}
        />
        <button type="button" onClick={copy} className="btn btn-sm glass-accent">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
