"use client";

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
// 5-Minuten-Schritte, Standard ist 00
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

/**
 * Startuhrzeit als Stunde/Minute-Auswahl. value ist "HH:MM" oder "" (keine
 * Uhrzeit); bei neu gewaehlter Stunde steht die Minute auf 00.
 */
export default function TimeSelects({
  id,
  value,
  onChange,
  disabled,
  compact,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [hour, minute = "00"] = value ? value.slice(0, 5).split(":") : [""];
  // Eine Minute ausserhalb der 5er-Schritte (z.B. 17:12) bleibt auswaehlbar.
  const minutes = MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort();
  const cls = `rounded border border-zinc-300 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 ${
    compact ? "bg-white px-1.5 py-0.5 text-sm text-zinc-700 dark:text-zinc-300" : "px-2 py-2"
  }`;

  return (
    <span className="inline-flex items-center gap-1">
      <select
        id={id}
        value={hour}
        onChange={(e) => onChange(e.target.value ? `${e.target.value}:${minute}` : "")}
        disabled={disabled}
        aria-label="Stunde"
        className={cls}
      >
        <option value="">--</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span aria-hidden="true">:</span>
      <select
        value={minute}
        onChange={(e) => onChange(`${hour}:${e.target.value}`)}
        disabled={disabled || !hour}
        aria-label="Minute"
        className={cls}
      >
        {minutes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <span className="text-sm text-zinc-500">Uhr</span>
    </span>
  );
}
