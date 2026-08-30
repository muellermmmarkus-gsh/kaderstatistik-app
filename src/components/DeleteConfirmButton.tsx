"use client";

import { useState } from "react";

/**
 * Wie DeleteButton, aber mit eigenem Popup statt window.confirm(), damit
 * die Buttons eigene Beschriftungen (z.B. "Termin löschen") statt der
 * Browser-Standardtexte bekommen. Muss als Kind eines <form> mit
 * Server-Action gerendert werden.
 */
export default function DeleteConfirmButton({
  message,
  triggerLabel,
  confirmLabel,
  cancelLabel = "Abbrechen",
  triggerClassName,
}: {
  message: string;
  triggerLabel: string;
  confirmLabel: string;
  cancelLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
            <p className="mb-4 text-sm">{message}</p>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
              >
                {cancelLabel}
              </button>
              <button
                type="submit"
                className="rounded bg-red-600 px-4 py-2 text-sm text-white"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
