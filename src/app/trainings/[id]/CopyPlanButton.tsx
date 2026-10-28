"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { copyTrainingPlan } from "./actions";

export type CopyTarget = {
  eventId: string;
  /** z.B. "Do., 29.10.2026" */
  label: string;
  /** Anzahl bereits gespeicherter Uebungen im Zieltermin */
  exerciseCount: number;
};

/** "Trainingsplan kopieren nach": Auswahl eines kuenftigen Trainingstermins mit Sicherheitsabfragen. */
export default function CopyPlanButton({
  sourceEventId,
  targets,
}: {
  sourceEventId: string;
  targets: CopyTarget[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ text: string; error?: boolean; target?: CopyTarget } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function copyTo(target: CopyTarget) {
    setOpen(false);
    if (
      !window.confirm(
        `Soll der Trainingsplan wirklich auf den Trainingstermin ${target.label} kopiert werden? Vorhandene Trainingsinhalte im Zieltermin werden dadurch unwiderruflich gelöscht!`,
      )
    ) {
      return;
    }
    if (
      target.exerciseCount > 0 &&
      !window.confirm(
        `Der Zieltermin ${target.label} enthält bereits Übungen! Soll dieser Trainingsplan wirklich auf den ausgewählten Trainingstermin kopiert werden? Vorhandene Trainingsinhalte im Zieltermin werden dadurch unwiderruflich gelöscht!`,
      )
    ) {
      return;
    }
    setResult(null);
    startTransition(async () => {
      const { error } = await copyTrainingPlan(sourceEventId, target.eventId);
      setResult(
        error
          ? { text: error, error: true }
          : { text: `Trainingsplan wurde auf ${target.label} kopiert.`, target },
      );
      // Uebungsanzahl der Zieltermine in der Auswahl aktualisieren.
      if (!error) router.refresh();
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="rounded border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
      >
        {pending ? "Kopiert…" : "Trainingsplan kopieren nach ▾"}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 max-h-80 w-72 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <p className="px-3 py-1.5 text-xs text-zinc-500">
            Kopiert wird der zuletzt gespeicherte Stand dieses Trainingsplans.
          </p>
          {targets.length ? (
            <ul role="listbox" aria-label="Zukünftige Trainingstermine">
              {targets.map((t) => (
                <li key={t.eventId}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => copyTo(t)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  >
                    <span>{t.label}</span>
                    {t.exerciseCount > 0 && (
                      <span className="text-xs text-amber-700 dark:text-amber-400">
                        {t.exerciseCount} {t.exerciseCount === 1 ? "Übung" : "Übungen"}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-zinc-500">Keine zukünftigen Trainingstermine vorhanden.</p>
          )}
        </div>
      )}
      {result && (
        <p
          role="status"
          className={`absolute right-0 top-full z-10 mt-1 w-72 rounded border bg-white px-3 py-2 text-xs shadow dark:bg-zinc-950 ${result.error ? "border-red-300 text-red-700" : "border-green-300 text-green-800 dark:text-green-400"}`}
        >
          {result.text}{" "}
          {result.target && (
            <Link href={`/trainings/${result.target.eventId}`} className="underline">
              Zum Zieltermin
            </Link>
          )}
          <button type="button" onClick={() => setResult(null)} className="ml-2 text-zinc-500" aria-label="Meldung schließen">
            ×
          </button>
        </p>
      )}
    </div>
  );
}
