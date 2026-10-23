"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Button "Zum Trainingsplatzplan". Muss im Anwesenheits-<form> stehen: bei
 * ungespeicherten Aenderungen fragt er nach und speichert auf Wunsch ueber
 * saveAndOpen (formAction), das danach zum Platzplan weiterleitet.
 */
export default function FieldPlanButton({
  canWrite,
  href,
  saveAndOpen,
}: {
  canWrite: boolean;
  href: string;
  saveAndOpen: (formData: FormData) => void;
}) {
  const router = useRouter();
  const dirtyRef = useRef(false);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const form = submitRef.current?.form;
    if (!form) return;
    const markDirty = () => {
      dirtyRef.current = true;
    };
    const markClean = () => {
      dirtyRef.current = false;
    };
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    form.addEventListener("submit", markClean);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
      form.removeEventListener("submit", markClean);
    };
  }, []);

  const handleClick = () => {
    if (canWrite && dirtyRef.current) setConfirmOpen(true);
    else router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
      >
        Zum Trainingsplatzplan
      </button>
      {/* Unsichtbarer Submit-Button, damit "Speichern" die Server Action dieses Buttons nutzt. */}
      <button ref={submitRef} type="submit" formAction={saveAndOpen} hidden aria-hidden="true" tabIndex={-1} />

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
            <p className="mb-4 text-sm font-medium">
              Es gibt ungespeicherte Änderungen. Sollen sie vor dem Wechsel zum Trainingsplatzplan
              gespeichert werden?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  submitRef.current?.form?.requestSubmit(submitRef.current);
                }}
                className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Speichern und weiter
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  router.push(href);
                }}
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
    </>
  );
}
