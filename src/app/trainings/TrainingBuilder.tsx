"use client";

import { useState } from "react";
import { categoryLabels } from "@/app/exercises/categoryLabels";

type Exercise = {
  id: string;
  name: string;
  hauptzweck: string;
  min_players: number;
  max_players: number;
  category: string;
  image_url?: string | null;
  fields?: { name: string; length_m: number; width_m: number } | null;
};

type Row = { key: string; category: string; exerciseId: string; duration: number };

function makeRow(): Row {
  return { key: crypto.randomUUID(), category: "", exerciseId: "", duration: 15 };
}

export default function TrainingBuilder({
  exercises,
  action,
  initialFocus,
  initialNotes,
  initialRows,
  submitLabel,
}: {
  exercises: Exercise[];
  action: (formData: FormData) => void;
  initialFocus?: string;
  initialNotes?: string;
  initialRows?: { exerciseId: string; duration: number }[];
  submitLabel: string;
}) {
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));

  const [rows, setRows] = useState<Row[]>(() =>
    initialRows?.length
      ? initialRows.map((row) => ({
          ...row,
          key: crypto.randomUUID(),
          category: exerciseById.get(row.exerciseId)?.category ?? "",
        }))
      : [makeRow()],
  );

  const totalMinutes = rows.reduce((sum, r) => sum + (r.duration || 0), 0);

  const totalsByCategory = new Map<string, number>();
  for (const row of rows) {
    if (!row.category) continue;
    totalsByCategory.set(
      row.category,
      (totalsByCategory.get(row.category) ?? 0) + (row.duration || 0),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, makeRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function changeCategory(key: string, category: string) {
    const firstMatch = exercises.find((ex) => ex.category === category);
    updateRow(key, { category, exerciseId: firstMatch?.id ?? "" });
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <form action={action} className="flex-1 space-y-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium" htmlFor="focus">
              Schwerpunkt Training
            </label>
            <input
              id="focus"
              name="focus"
              defaultValue={initialFocus}
              className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
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
            const categoryExercises = row.category
              ? exercises.filter((ex) => ex.category === row.category)
              : [];
            return (
              <div
                key={row.key}
                className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Kategorie</label>
                    <select
                      value={row.category}
                      onChange={(e) => changeCategory(row.key, e.target.value)}
                      className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="">– wählen –</option>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
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
                  <div className="min-w-[220px] flex-[2]">
                    <label className="mb-1 block text-sm font-medium">Übung</label>
                    <select
                      name="exercise_id"
                      value={row.exerciseId}
                      onChange={(e) => updateRow(row.key, { exerciseId: e.target.value })}
                      className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      {!row.category && (
                        <option value="">– zuerst Kategorie wählen –</option>
                      )}
                      {categoryExercises.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <label className="mb-1 block text-sm font-medium">
                      Übungsfläche
                    </label>
                    <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                      {exercise?.fields
                        ? `${exercise.fields.name} (${exercise.fields.length_m}×${exercise.fields.width_m} m)`
                        : "–"}
                    </p>
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

        <button
          type="button"
          onClick={addRow}
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          + Übung hinzufügen
        </button>

        <button
          type="submit"
          className="block rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {submitLabel}
        </button>
      </form>

      <aside className="w-full shrink-0 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800 md:w-56">
        <h2 className="mb-3 font-medium">Dauer nach Kategorie</h2>
        <ul className="space-y-1">
          {Object.entries(categoryLabels).map(([value, label]) => (
            <li key={value} className="flex justify-between">
              <span className="text-zinc-500">{label}</span>
              <span>{totalsByCategory.get(value) ?? 0} min</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-zinc-200 pt-2 font-medium dark:border-zinc-800">
          <span>Gesamt</span>
          <span>{totalMinutes} min</span>
        </div>
      </aside>
    </div>
  );
}
