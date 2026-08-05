"use client";

import { useState } from "react";

type Exercise = {
  id: string;
  name: string;
  hauptzweck: string;
  min_players: number;
  max_players: number;
  image_url?: string | null;
};

type Row = { key: string; exerciseId: string; duration: number };

function makeRow(exercises: Exercise[]): Row {
  return {
    key: crypto.randomUUID(),
    exerciseId: exercises[0]?.id ?? "",
    duration: 15,
  };
}

export default function TrainingBuilder({
  exercises,
  action,
  initialDate,
  initialNotes,
  initialRows,
  submitLabel,
}: {
  exercises: Exercise[];
  action: (formData: FormData) => void;
  initialDate?: string;
  initialNotes?: string;
  initialRows?: { exerciseId: string; duration: number }[];
  submitLabel: string;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initialRows?.length
      ? initialRows.map((row) => ({ ...row, key: crypto.randomUUID() }))
      : [makeRow(exercises)],
  );

  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const totalMinutes = rows.reduce((sum, r) => sum + (r.duration || 0), 0);

  function addRow() {
    setRows((prev) => [...prev, makeRow(exercises)]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <form action={action} className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="trainingDate">
            Datum
          </label>
          <input
            id="trainingDate"
            name="trainingDate"
            type="date"
            required
            defaultValue={initialDate}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="notes">
            Notizen
          </label>
          <input
            id="notes"
            name="notes"
            defaultValue={initialNotes}
            className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => {
          const exercise = exerciseById.get(row.exerciseId);
          return (
            <div
              key={row.key}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-end gap-3">
                {exercise?.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- externe Supabase-Storage-URL
                  <img
                    src={exercise.image_url}
                    alt=""
                    className="h-12 w-12 rounded border border-zinc-300 object-cover dark:border-zinc-700"
                  />
                ) : (
                  <div className="h-12 w-12 rounded border border-dashed border-zinc-300 dark:border-zinc-700" />
                )}
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium">Übung</label>
                  <select
                    name="exercise_id"
                    value={row.exerciseId}
                    onChange={(e) => updateRow(row.key, { exerciseId: e.target.value })}
                    className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Dauer (min)</label>
                  <input
                    type="number"
                    name="duration_minutes"
                    min={1}
                    value={row.duration}
                    onChange={(e) =>
                      updateRow(row.key, { duration: Number(e.target.value) })
                    }
                    className="w-24 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length === 1}
                  className="text-sm text-zinc-600 hover:underline disabled:opacity-40 dark:text-zinc-400"
                >
                  entfernen
                </button>
              </div>
              {exercise && (
                <p className="mt-2 text-xs text-zinc-500">
                  {exercise.hauptzweck} · {exercise.min_players}–{exercise.max_players}{" "}
                  Spieler
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addRow}
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          + Übung hinzufügen
        </button>
        <p className="text-sm text-zinc-500">Gesamtdauer: {totalMinutes} min</p>
      </div>

      <button
        type="submit"
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        {submitLabel}
      </button>
    </form>
  );
}
