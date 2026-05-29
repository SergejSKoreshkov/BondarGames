"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

function parseLocalDate(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}
function toValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Date field with a glass-skinned react-day-picker popover. `value`/`onChange`
 * use a local "YYYY-MM-DD" string. Days before `min` are disabled.
 */
export function DatePicker({
  value,
  onChange,
  min,
  placeholder = "Pick a date",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  min?: Date;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = parseLocalDate(value);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = selected
    ? new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(selected)
    : placeholder;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="field flex items-center justify-between text-left"
      >
        <span className={selected ? "" : "text-[var(--muted)]"}>{label}</span>
        <CalendarIcon />
      </button>
      {open && (
        <div className="absolute z-50 mt-2 left-0 rdp-glass glass-strong rounded-2xl p-2">
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected ?? min}
            disabled={min ? { before: min } : undefined}
            onSelect={(d) => {
              if (d) {
                onChange(toValue(d));
                setOpen(false);
              }
            }}
            weekStartsOn={1}
            showOutsideDays
          />
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[var(--muted)] shrink-0">
      <rect x="3" y="4.5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
