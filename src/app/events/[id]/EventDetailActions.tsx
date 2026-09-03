"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Muss als Nachfahre des Anwesenheits-<form> gerendert werden: der
 * "Speichern und Zurück"-Button haengt per formAction an diesem Formular,
 * und die Dirty-Erkennung fuer "Zurück" hoert auf dessen change-Events.
 */
export default function EventDetailActions({
  canWrite,
  hasContent,
  saveAndBack,
  backHref,
}: {
  canWrite: boolean;
  hasContent: boolean;
  saveAndBack: (formData: FormData) => void;
  backHref: string;
}) {
  const router = useRouter();
  const dirtyRef = useRef(false);
  const saveAndBackButtonRef = useRef<HTMLButtonElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const form = saveAndBackButtonRef.current?.form;
    if (!form) return;
    const markDirty = () => {
      dirtyRef.current = true;
    };
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
    };
  }, []);

  const handleBack = () => {
    if (dirtyRef.current) {
      setConfirmOpen(true);
    } else {
      router.push(backHref);
    }
  };

  const handleSaveAndBack = () => {
    setConfirmOpen(false);
    saveAndBackButtonRef.current?.form?.requestSubmit(saveAndBackButtonRef.current);
  };

  const handleDiscard = () => {
    setConfirmOpen(false);
    router.push(backHref);
  };

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {canWrite && hasContent && (
        <>
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Speichern
          </button>
          <button
            ref={saveAndBackButtonRef}
            type="submit"
            formAction={saveAndBack}
            className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
          >
            Speichern und Zurück
          </button>
        </>
      )}
      <button
        type="button"
        onClick={handleBack}
        className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
      >
        Zurück
      </button>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
            <p className="mb-4 text-sm font-medium">
              Es gibt ungespeicherte Änderungen. Sollen sie gespeichert werden?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveAndBack}
                className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Speichern und zurück
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
              >
                Verwerfen
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
