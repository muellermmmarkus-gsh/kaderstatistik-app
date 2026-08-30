"use client";

import { useState, useTransition } from "react";
import { deleteEventType } from "./actions";

/**
 * Zweistufige Bestaetigung zum Loeschen einer (nicht eingebauten) Terminart:
 * 1. allgemeine Rueckfrage, 2. Auswirkung (Anzahl betroffener Termine) mit
 * eigener Bestaetigung. Ruft die Server-Action direkt auf (kein <form>),
 * da dieser Button innerhalb des uebergeordneten Speichern-Formulars steht
 * und ein verschachteltes <form> ungueltiges HTML waere.
 */
export default function DeleteEventTypeButton({
  typeKey,
  eventCount,
  onDeleted,
}: {
  typeKey: string;
  eventCount: number;
  onDeleted: () => void;
}) {
  const [stage, setStage] = useState<"closed" | "confirm" | "impact">("closed");
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      await deleteEventType(typeKey);
      setStage("closed");
      onDeleted();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setStage("confirm")}
        className="shrink-0 text-sm text-red-600 hover:underline dark:text-red-400"
      >
        löschen
      </button>

      {stage === "confirm" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setStage("closed")}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-4 text-sm">
              Willst du diese Terminart wirklich löschen?
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setStage("closed")}
                className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => setStage("impact")}
                className="rounded bg-red-600 px-4 py-2 text-sm text-white"
              >
                Löschen bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === "impact" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => (isPending ? null : setStage("closed"))}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-4 text-sm">
              Wenn du diese Terminart löschst, dann {eventCount === 1 ? "hat" : "haben"}{" "}
              {eventCount} {eventCount === 1 ? "Termin" : "Termine"} im Kalender KEINE
              Terminart mehr zugewiesen.
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setStage("closed")}
                disabled={isPending}
                className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isPending}
                className="rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Löschen der Terminart trotzdem bestätigen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
