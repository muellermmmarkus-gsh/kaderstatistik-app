"use client";

import { useRef } from "react";

/**
 * Sammel-Button ueber einer Spalte der Anwesenheitstabelle: setzt Haken
 * direkt im umgebenden Formular (Server-gerenderte Checkboxen).
 * - "registered": alle Spieler angemeldet
 * - "present": alle angemeldeten Spieler anwesend
 * Muss im Anwesenheits-<form> stehen; loest change-Events aus, damit die
 * Erkennung ungespeicherter Aenderungen greift.
 */
export default function BulkCheckButton({ target, label }: { target: "registered" | "present"; label: string }) {
  const ref = useRef<HTMLButtonElement>(null);

  function apply() {
    const form = ref.current?.form;
    if (!form) return;
    const check = (input: HTMLInputElement | null) => {
      if (!input || input.disabled || input.checked) return;
      input.checked = true;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const registered = [...form.querySelectorAll<HTMLInputElement>('input[name^="registered_player_"]')];
    if (target === "registered") {
      registered.forEach(check);
      return;
    }
    for (const box of registered) {
      if (!box.checked) continue;
      const playerId = box.name.slice("registered_player_".length);
      check(form.querySelector<HTMLInputElement>(`input[name="present_player_${playerId}"]`));
    }
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={apply}
      className="mb-1 block whitespace-nowrap rounded border border-zinc-300 px-2 py-0.5 text-xs font-normal text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
    >
      {label}
    </button>
  );
}
