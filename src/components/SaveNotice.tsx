"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Zeigt ein "Speichern erfolgreich"-Popup, sobald das umschliessende <form>
 * von pending auf nicht-pending wechselt (Server Action abgeschlossen).
 * Muss als Kind des jeweiligen <form>-Elements gerendert werden, da
 * useFormStatus() den Status des naechstgelegenen Eltern-<form> liest.
 */
export default function SaveNotice() {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (wasPending.current && !pending) {
      setOpen(true);
    }
    wasPending.current = pending;
  }, [pending]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <p className="mb-4 text-sm font-medium">Speichern erfolgreich</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          OK
        </button>
      </div>
    </div>
  );
}
