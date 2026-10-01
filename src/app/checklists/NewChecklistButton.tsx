"use client";

import { useActionState, useState } from "react";
import { createChecklist } from "./actions";

export default function NewChecklistButton() {
  const [open, setOpen] = useState(false);
  const [error, formAction, pending] = useActionState(createChecklist, null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Neue Checkliste erstellen
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <form
            action={formAction}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-checklist-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900"
          >
            <h2 id="new-checklist-title" className="mb-4 font-medium">
              Neue Checkliste
            </h2>
            <label htmlFor="checklist-name" className="mb-1 block text-sm font-medium">
              Name der Checkliste
            </label>
            <input
              id="checklist-name"
              name="name"
              required
              autoFocus
              maxLength={100}
              placeholder="z.B. Trikots zurückgegeben"
              className="mb-4 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <p className="mb-4 text-xs text-zinc-500">
              Die Liste enthält alle aktiven Spieler und Trainer.
            </p>
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {pending ? "Wird erstellt…" : "Erstellen"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
