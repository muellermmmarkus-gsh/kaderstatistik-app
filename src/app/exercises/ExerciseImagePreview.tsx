"use client";

import { useState, useTransition } from "react";
import { removeExerciseImage } from "./actions";

/**
 * Bild-Vorschau im Aenderungsformular mit rotem X oben rechts: Klick
 * entfernt das Bild sofort (ohne Speichern des restlichen Formulars) aus
 * der Uebung und blendet es aus.
 */
export default function ExerciseImagePreview({
  exerciseId,
  imageUrl,
}: {
  exerciseId: string;
  imageUrl: string;
}) {
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (removed) return null;

  return (
    <div className="mb-2">
      <div className="relative inline-block">
        <a href={imageUrl} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element -- externe Supabase-Storage-URL, next/image benoetigt bekannte Domains */}
          <img
            src={imageUrl}
            alt=""
            className={`h-16 w-16 rounded border border-zinc-300 object-cover dark:border-zinc-700 ${pending ? "opacity-50" : ""}`}
          />
        </a>
        <button
          type="button"
          disabled={pending}
          title="Bild entfernen"
          aria-label="Bild entfernen"
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await removeExerciseImage(exerciseId);
                setRemoved(true);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Bild konnte nicht entfernt werden.");
              }
            });
          }}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-red-200 bg-white text-xs font-bold leading-none text-red-600 shadow hover:bg-red-600 hover:text-white disabled:opacity-50 dark:border-red-900 dark:bg-zinc-900"
        >
          ×
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
