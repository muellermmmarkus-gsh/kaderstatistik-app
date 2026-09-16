"use client";

import { useRef, useState } from "react";

export default function DeleteEventButton({
  action,
  className,
}: {
  action: (formData: FormData) => void;
  className?: string;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={action} className="inline">
        <button type="button" onClick={() => setStep(1)} className={className}>
          löschen
        </button>
      </form>

      {step === 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
            <p className="mb-4 text-sm">
              Soll dieser Termin wirklich gelöscht werden? Alle Daten in diesem Termin
              werden unwiderruflich gelöscht.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                Ja, Termin und alle Daten im Termin unwiderruflich löschen
              </button>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
            <p className="mb-4 text-sm font-medium">
              Termin soll wirklich mit Daten gelöscht werden?
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep(0);
                  formRef.current?.requestSubmit();
                }}
                className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                Ja, löschen
              </button>
              <button
                type="button"
                onClick={() => setStep(0)}
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
