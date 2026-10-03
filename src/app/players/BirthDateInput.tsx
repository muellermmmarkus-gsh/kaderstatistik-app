"use client";

import { useEffect, useState, type FocusEvent } from "react";
import { savePlayerBirthDate } from "./actions";

// Speichert beim Verlassen des Feldes, nicht bei jeder Eingabe - sonst wuerde
// ein halb getipptes (noch ungueltiges = leeres) Datum das alte ueberschreiben.
export default function BirthDateInput({
  playerId,
  playerName,
  initialValue,
}: {
  playerId: string;
  playerName: string;
  initialValue: string;
}) {
  const [saved, setSaved] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "saved") return;
    const timer = setTimeout(() => setStatus("idle"), 2500);
    return () => clearTimeout(timer);
  }, [status]);

  async function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const value = event.currentTarget.value;
    if (value === saved) return;
    setStatus("saving");
    const result = await savePlayerBirthDate(playerId, value);
    if (result) {
      setError(result);
      setStatus("error");
      return;
    }
    setSaved(value);
    setError(null);
    setStatus("saved");
  }

  return (
    <span className="inline-flex items-center gap-2">
      <input
        type="date"
        defaultValue={initialValue}
        onBlur={handleBlur}
        aria-label={`Geburtsdatum ${playerName}`}
        className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <span className="w-20 text-xs" aria-live="polite">
        {status === "saving" && <span className="text-zinc-500">speichert…</span>}
        {status === "saved" && <span className="text-green-700 dark:text-green-400">✓ gespeichert</span>}
        {status === "error" && (
          <span className="text-red-600" title={error ?? undefined}>
            Fehler
          </span>
        )}
      </span>
    </span>
  );
}
