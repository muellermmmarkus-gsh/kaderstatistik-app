"use client";

import { useState } from "react";
import SaveNotice from "@/components/SaveNotice";

type FocusField = { key: string; value: string };

export default function ExerciseFocusForm({
  action,
  initialFocuses,
}: {
  action: (formData: FormData) => void;
  initialFocuses: string[];
}) {
  const [focuses, setFocuses] = useState<FocusField[]>(() =>
    initialFocuses.length
      ? initialFocuses.map((value) => ({ key: crypto.randomUUID(), value }))
      : [{ key: crypto.randomUUID(), value: "" }],
  );

  function updateFocus(key: string, value: string) {
    setFocuses((prev) => prev.map((f) => (f.key === key ? { ...f, value } : f)));
  }

  function addFocus() {
    setFocuses((prev) => [...prev, { key: crypto.randomUUID(), value: "" }]);
  }

  function removeFocus(key: string) {
    setFocuses((prev) => (prev.length > 1 ? prev.filter((f) => f.key !== key) : prev));
  }

  return (
    <form action={action} className="space-y-3">
      {focuses.map((focus, index) => (
        <div key={focus.key} className="flex items-center gap-2">
          <input
            type="text"
            name="focus"
            value={focus.value}
            onChange={(e) => updateFocus(focus.key, e.target.value)}
            placeholder={`Übungsschwerpunkt ${index + 1}`}
            className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={() => removeFocus(focus.key)}
            disabled={focuses.length === 1}
            className="text-sm text-zinc-600 hover:underline disabled:opacity-40 dark:text-zinc-400"
          >
            entfernen
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addFocus}
        className="block text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        + weiterer Schwerpunkt
      </button>

      <button
        type="submit"
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Änderungen speichern
      </button>
      <SaveNotice />
    </form>
  );
}
