"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { categoryLabels } from "./categoryLabels";
import { deleteExercise } from "./actions";
import DeleteButton from "@/components/DeleteButton";

type ExerciseRow = {
  id: string;
  name: string;
  hauptzweck: string;
  nebenzweck: string | null;
  min_players: number;
  max_players: number;
  small_goals: number;
  mini_goals: number;
  category: string;
  image_url: string | null;
  fields: { name: string } | null;
};

const NO_FIELD = "__keine__";

function FilterDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  return (
    <details className="relative">
      <summary className="cursor-pointer list-none select-none rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
        {label}
        {selected.length > 0 && ` (${selected.length})`}
      </summary>
      <div className="absolute z-10 mt-1 max-h-60 w-64 overflow-y-auto rounded border border-zinc-300 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => toggle(option.value)}
              className="h-4 w-4"
            />
            {option.label}
          </label>
        ))}
        {!options.length && (
          <p className="px-1 py-1 text-xs text-zinc-500">Keine Optionen</p>
        )}
      </div>
    </details>
  );
}

export default function ExercisesTable({
  exercises,
  canWrite,
}: {
  exercises: ExerciseRow[];
  canWrite: boolean;
}) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedFocuses, setSelectedFocuses] = useState<string[]>([]);

  const categoryOptions = useMemo(
    () =>
      [...new Set(exercises.map((e) => e.category))]
        .sort()
        .map((value) => ({ value, label: categoryLabels[value] ?? value })),
    [exercises],
  );

  const fieldOptions = useMemo(() => {
    const names = [
      ...new Set(
        exercises.map((e) => e.fields?.name).filter((n): n is string => !!n),
      ),
    ].sort();
    const options = names.map((value) => ({ value, label: value }));
    if (exercises.some((e) => !e.fields?.name)) {
      options.unshift({ value: NO_FIELD, label: "– keine Fläche –" });
    }
    return options;
  }, [exercises]);

  const focusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of exercises) {
      if (e.hauptzweck) set.add(e.hauptzweck);
      if (e.nebenzweck) set.add(e.nebenzweck);
    }
    return [...set].sort().map((value) => ({ value, label: value }));
  }, [exercises]);

  const filtered = exercises.filter((exercise) => {
    if (
      selectedCategories.length &&
      !selectedCategories.includes(exercise.category)
    )
      return false;
    if (selectedFields.length) {
      const fieldValue = exercise.fields?.name ?? NO_FIELD;
      if (!selectedFields.includes(fieldValue)) return false;
    }
    if (selectedFocuses.length) {
      const matches =
        selectedFocuses.includes(exercise.hauptzweck) ||
        (!!exercise.nebenzweck && selectedFocuses.includes(exercise.nebenzweck));
      if (!matches) return false;
    }
    return true;
  });

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedFields.length > 0 ||
    selectedFocuses.length > 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <FilterDropdown
          label="Kategorie"
          options={categoryOptions}
          selected={selectedCategories}
          onChange={setSelectedCategories}
        />
        <FilterDropdown
          label="Fläche"
          options={fieldOptions}
          selected={selectedFields}
          onChange={setSelectedFields}
        />
        <FilterDropdown
          label="Übungsschwerpunkt"
          options={focusOptions}
          selected={selectedFocuses}
          onChange={setSelectedFocuses}
        />
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSelectedCategories([]);
              setSelectedFields([]);
              setSelectedFocuses([]);
            }}
            className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2" />
            <th className="py-2">Name</th>
            <th className="py-2">Kategorie</th>
            <th className="py-2">Fläche</th>
            <th className="py-2">Übungsschwerpunkt 1</th>
            <th className="py-2">Übungsschwerpunkt 2</th>
            <th className="py-2">Spieler</th>
            <th className="py-2">Kleinfeldtore</th>
            <th className="py-2">Minitore</th>
            {canWrite && <th className="py-2" />}
          </tr>
        </thead>
        <tbody>
          {filtered.map((exercise) => {
            const remove = deleteExercise.bind(null, exercise.id, undefined);
            return (
              <tr
                key={exercise.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2">
                  {exercise.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- externe Supabase-Storage-URL
                    <img
                      src={exercise.image_url}
                      alt=""
                      className="h-10 w-10 rounded border border-zinc-300 object-cover dark:border-zinc-700"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded border border-dashed border-zinc-300 dark:border-zinc-700" />
                  )}
                </td>
                <td className="py-2">
                  <Link href={`/exercises/${exercise.id}`} className="hover:underline">
                    {exercise.name}
                  </Link>
                </td>
                <td className="py-2 text-zinc-500">
                  {categoryLabels[exercise.category] ?? exercise.category}
                </td>
                <td className="py-2 text-zinc-500">{exercise.fields?.name ?? "–"}</td>
                <td className="py-2 text-zinc-500">{exercise.hauptzweck}</td>
                <td className="py-2 text-zinc-500">{exercise.nebenzweck || "–"}</td>
                <td className="py-2 text-zinc-500">
                  {exercise.min_players}–{exercise.max_players}
                </td>
                <td className="py-2 text-zinc-500">{exercise.small_goals}</td>
                <td className="py-2 text-zinc-500">{exercise.mini_goals}</td>
                {canWrite && (
                  <td className="py-2 text-right whitespace-nowrap">
                    <Link
                      href={`/exercises/${exercise.id}`}
                      className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
                    >
                      ändern
                    </Link>
                    <form action={remove} className="ml-3 inline">
                      <DeleteButton
                        confirmMessage={`Übung "${exercise.name}" wirklich löschen?`}
                        className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
                      >
                        löschen
                      </DeleteButton>
                    </form>
                  </td>
                )}
              </tr>
            );
          })}
          {!filtered.length && (
            <tr>
              <td colSpan={canWrite ? 10 : 9} className="py-4 text-zinc-500">
                {exercises.length
                  ? "Keine Übungen entsprechen den gewählten Filtern."
                  : "Noch keine Übungen angelegt."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
