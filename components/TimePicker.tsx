"use client";

const MINUTES = [0, 15, 30, 45];

function parse(value: string): [number, number] {
  const [h, m] = (value || "0:0").split(":").map((n) => parseInt(n, 10) || 0);
  return [h, m];
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Time picker whose dropdowns expose ONLY whole hours and 00/15/30/45 minutes.
 * `value` / `onChange` use an "HH:MM" string. Used for opening hours and event
 * durations so users can't pick off-grid minutes.
 */
export function TimePicker({
  value,
  onChange,
  maxHour = 23,
  className = "",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  maxHour?: number;
  className?: string;
  ariaLabel?: string;
}) {
  const [h, rawM] = parse(value);
  // Snap the incoming minute to the nearest allowed option for display.
  const m = MINUTES.reduce((best, cur) => (Math.abs(cur - rawM) < Math.abs(best - rawM) ? cur : best), 0);
  const hours = Array.from({ length: maxHour + 1 }, (_, i) => i);

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <select
        aria-label={ariaLabel ? `${ariaLabel} hour` : "Hour"}
        value={h}
        onChange={(e) => onChange(`${pad(Number(e.target.value))}:${pad(m)}`)}
        className="field"
        style={{ width: "auto", height: 38, paddingRight: 28 }}
      >
        {hours.map((hh) => (
          <option key={hh} value={hh}>
            {pad(hh)}
          </option>
        ))}
      </select>
      <span className="text-[var(--muted)]">:</span>
      <select
        aria-label={ariaLabel ? `${ariaLabel} minute` : "Minute"}
        value={m}
        onChange={(e) => onChange(`${pad(h)}:${pad(Number(e.target.value))}`)}
        className="field"
        style={{ width: "auto", height: 38, paddingRight: 28 }}
      >
        {MINUTES.map((mm) => (
          <option key={mm} value={mm}>
            {pad(mm)}
          </option>
        ))}
      </select>
    </span>
  );
}
