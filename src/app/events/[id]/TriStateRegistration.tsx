"use client";

import { useState } from "react";

export type Registration = "none" | "yes" | "tentative";

const NEXT: Record<Registration, Registration> = { none: "yes", yes: "tentative", tentative: "none" };
const STATE_LABELS: Record<Registration, string> = {
  none: "Nicht zugesagt",
  yes: "Zugesagt",
  tentative: "Mit Vorbehalt zugesagt",
};

/**
 * Feld "Zugesagt" im Trainingstermin mit drei Zustaenden: ein Klick = zugesagt,
 * zweiter Klick = mit Vorbehalt zugesagt, dritter Klick = leer. Schreibt die
 * Werte als versteckte Felder ins Anwesenheitsformular und loest ein
 * change-Event aus (Erkennung ungespeicherter Aenderungen, Summe im Kopf).
 */
export default function TriStateRegistration({
  playerId,
  playerName,
  initial,
  disabled,
}: {
  playerId: string;
  playerName: string;
  initial: Registration;
  disabled?: boolean;
}) {
  const [value, setValue] = useState<Registration>(initial);

  return (
    <>
      <input type="hidden" name={`registered_player_${playerId}`} value={value === "none" ? "" : "on"} />
      <input type="hidden" name={`tentative_player_${playerId}`} value={value === "tentative" ? "on" : ""} />
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          setValue(NEXT[value]);
          e.currentTarget.dispatchEvent(new Event("change", { bubbles: true }));
        }}
        data-registration={value}
        title={`${STATE_LABELS[value]} – Klick: ${STATE_LABELS[NEXT[value]]}`}
        aria-label={`${playerName}: ${STATE_LABELS[value]}`}
        className={`flex h-4 w-4 items-center justify-center rounded-sm border text-[11px] font-bold leading-none disabled:opacity-50 ${
          value === "yes"
            ? "border-blue-600 bg-blue-600 text-white"
            : value === "tentative"
              ? "border-amber-500 bg-amber-400 text-white"
              : "border-zinc-400 bg-white dark:bg-zinc-900"
        }`}
      >
        {value === "yes" ? "✓" : value === "tentative" ? "?" : ""}
      </button>
    </>
  );
}
