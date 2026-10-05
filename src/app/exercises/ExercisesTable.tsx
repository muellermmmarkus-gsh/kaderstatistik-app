"use client";

import { useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { categoryLabels } from "./categoryLabels";
import {
  deleteExercise,
  duplicateExercise,
  setExerciseActiveInTeam,
  setExercisePublic,
} from "./actions";
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
  /** Einsaetze in der laufenden Saison (Uebungsdatenbank: Summe aller Teams). */
  seasonCount: number;
  /** Teams, die die Uebung in ihrer laufenden Saison genutzt haben. */
  teamUsage: { team: string; uses: number }[];
  /** Einsaetze des eigenen Teams in der laufenden Saison. */
  ownSeasonCount: number;
  /** Oeffentlich: fuer andere Teams in der Uebungsdatenbank sichtbar. */
  isPublic: boolean;
  /** Uebung erscheint unter "Uebungen" des eigenen Teams. */
  activeInTeam: boolean;
  /** Team, das die Uebung angelegt hat. */
  createdByTeam: string | null;
  /** Darf geaendert/geloescht werden (Admin oder eigenes Erstellerteam). */
  editable: boolean;
};

const NO_FIELD = "__keine__";

function PublicToggle({
  exerciseId,
  exerciseName,
  initialPublic,
  disabled,
}: {
  exerciseId: string;
  exerciseName: string;
  initialPublic: boolean;
  disabled: boolean;
}) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(next: boolean) {
    if (next === isPublic) return;
    setIsPublic(next);
    startTransition(async () => {
      const result = await setExercisePublic(exerciseId, next);
      if (result) {
        setIsPublic(!next);
        setError(result);
      } else {
        setError(null);
      }
    });
  }

  return (
    <>
      <div
        role="radiogroup"
        aria-label={`Sichtbarkeit von ${exerciseName} in der Übungsdatenbank`}
        title={
          disabled
            ? "Ändern kann nur das Team, das die Übung erstellt hat, oder der Administrator"
            : undefined
        }
        className="inline-flex overflow-hidden rounded border border-zinc-300 text-xs dark:border-zinc-700"
      >
        {(
          [
            [true, "öff"],
            [false, "n.öff"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={isPublic === value}
            disabled={disabled || pending}
            onClick={() => choose(value)}
            className={`px-1.5 py-1 disabled:cursor-default ${
              isPublic === value
                ? value
                  ? "bg-green-600 text-white"
                  : "bg-zinc-600 text-white"
                : "bg-white text-zinc-500 dark:bg-zinc-900"
            } ${disabled && isPublic !== value ? "opacity-40" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <span className="block text-xs text-red-600" title={error}>
          Fehler
        </span>
      )}
    </>
  );
}

function TeamToggle({
  exerciseId,
  exerciseName,
  initialActive,
  disabled,
}: {
  exerciseId: string;
  exerciseName: string;
  initialActive: boolean;
  disabled: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !active;
    setActive(next);
    startTransition(async () => {
      const result = await setExerciseActiveInTeam(exerciseId, next);
      if (result) {
        setActive(!next);
        setError(result);
      } else {
        setError(null);
      }
    });
  }

  return (
    <>
      <input
        type="checkbox"
        checked={active}
        disabled={disabled || pending}
        onChange={toggle}
        aria-label={`${exerciseName} in meinem Team aktiv`}
        className="h-4 w-4"
      />
      {error && (
        <span className="block text-xs text-red-600" title={error}>
          Fehler
        </span>
      )}
    </>
  );
}

function CopyButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title="Kopie der Übung erstellen"
      className="text-xs text-zinc-500 hover:underline disabled:opacity-50 dark:text-zinc-400"
    >
      {pending ? "Kopie …" : "Kopie erst."}
    </button>
  );
}

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
  returnTo,
  showTeamToggle = false,
}: {
  exercises: ExerciseRow[];
  /** Trainer: Kopie erstellen, "In Team aktiv" setzen. */
  canWrite: boolean;
  /** Seite, auf die nach dem Loeschen zurueckgeleitet wird. */
  returnTo: string;
  /** Spalten "Erstellt von" und "In Team aktiv" (nur in der Uebungsdatenbank). */
  showTeamToggle?: boolean;
}) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedFocuses, setSelectedFocuses] = useState<string[]>([]);
  // Uebungsdatenbank: Sortierung nach akt.Sai. aller Teams (Voreinstellung)
  // oder nur des eigenen Teams.
  const [sortBy, setSortBy] = useState<"all" | "own">("all");

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

  const matching = exercises.filter((exercise) => {
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

  const seasonValue = (e: ExerciseRow) => (sortBy === "all" ? e.seasonCount : e.ownSeasonCount);
  const filtered = showTeamToggle
    ? [...matching].sort(
        (a, b) => seasonValue(b) - seasonValue(a) || a.name.localeCompare(b.name, "de"),
      )
    : matching;

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
        {showTeamToggle && (
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Sortierung nach akt.Sai.:</span>
            <div
              role="radiogroup"
              aria-label="Sortierung nach Einsätzen in der laufenden Saison"
              className="flex overflow-hidden rounded border border-zinc-300 dark:border-zinc-700"
            >
              {(
                [
                  ["all", "Summe aller Teams"],
                  ["own", "Eigenes Team"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={sortBy === value}
                  onClick={() => setSortBy(value)}
                  className={`px-3 py-2 ${
                    sortBy === value
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Feste Spaltenbreiten: nur "Name" nimmt den restlichen Platz, alle
          anderen Spalten sind schmal und brechen bei Bedarf um. */}
      <table className="w-full table-fixed text-left text-sm">
        <colgroup>
          <col className="w-12" />
          <col />
          {showTeamToggle && <col className="w-20" />}
          <col className="w-24" />
          <col className="w-28" />
          <col className="w-28" />
          <col className="w-28" />
          <col className="w-16" />
          <col className="w-20" />
          <col className="w-16" />
          <col className="w-14" />
          {showTeamToggle && <col className="w-28" />}
          {showTeamToggle && <col className="w-16" />}
          {!showTeamToggle && <col className="w-24" />}
          {canWrite && <col className="w-24" />}
        </colgroup>
        <thead>
          <tr className="border-b border-zinc-200 align-bottom dark:border-zinc-800">
            <th className="py-2 pr-3" />
            <th className="py-2 pr-4">Name</th>
            {showTeamToggle && <th className="py-2 pr-3">Erstellt von</th>}
            <th className="py-2 pr-3">Kategorie</th>
            <th className="py-2 pr-3">Fläche</th>
            <th className="py-2 pr-3">Üb.schwp. 1</th>
            <th className="py-2 pr-3">Üb.schwp. 2</th>
            <th className="py-2 pr-3">Spieler</th>
            <th className="py-2 pr-3">Kleinfeld&shy;tore</th>
            <th className="py-2 pr-3">Mini&shy;tore</th>
            <th
              className="py-2 pr-3"
              title={
                showTeamToggle
                  ? "Einsätze in der laufenden Saison, Summe aller Teams"
                  : "Einsätze in der laufenden Saison"
              }
            >
              akt.Sai.
            </th>
            {showTeamToggle && (
              <th className="py-2 pr-3" title="Teams, die die Übung in ihrer laufenden Saison genutzt haben (Anzahl Einsätze)">
                Teams
              </th>
            )}
            {showTeamToggle && (
              <th className="py-2 pr-3 text-center" title="Übung erscheint unter „Übungen“ in deinem Team">
                In Team aktiv
              </th>
            )}
            {!showTeamToggle && (
              <th
                className="py-2 pr-3 text-center"
                title="öff = für andere Teams in der Übungsdatenbank sichtbar, n.öff = nur für dein Team und den Administrator"
              >
                öff.
              </th>
            )}
            {canWrite && <th className="py-2" />}
          </tr>
        </thead>
        <tbody>
          {filtered.map((exercise) => {
            const remove = deleteExercise.bind(null, exercise.id, returnTo);
            const copy = duplicateExercise.bind(null, exercise.id);
            return (
              <tr
                key={exercise.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2 pr-3">
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
                <td className="py-2 pr-4">
                  <Link href={`/exercises/${exercise.id}`} className="hover:underline">
                    {exercise.name}
                  </Link>
                  {showTeamToggle && !exercise.isPublic && (
                    <span
                      className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      title="Nicht öffentlich: für andere Teams nicht sichtbar"
                    >
                      n.öff
                    </span>
                  )}
                </td>
                {showTeamToggle && (
                  <td className="py-2 pr-3 text-zinc-500">{exercise.createdByTeam ?? "–"}</td>
                )}
                <td className="py-2 pr-3 text-zinc-500">
                  {categoryLabels[exercise.category] ?? exercise.category}
                </td>
                <td className="py-2 pr-3 text-zinc-500">{exercise.fields?.name ?? "–"}</td>
                <td className="py-2 pr-3 text-zinc-500">{exercise.hauptzweck}</td>
                <td className="py-2 pr-3 text-zinc-500">{exercise.nebenzweck || "–"}</td>
                <td className="whitespace-nowrap py-2 pr-3 text-zinc-500">
                  {exercise.min_players}–{exercise.max_players}
                </td>
                <td className="py-2 pr-3 text-zinc-500">{exercise.small_goals}</td>
                <td className="py-2 pr-3 text-zinc-500">{exercise.mini_goals}</td>
                <td className="py-2 pr-3 text-zinc-500">{exercise.seasonCount}</td>
                {showTeamToggle && (
                  <td className="py-2 pr-3 text-xs text-zinc-500">
                    {exercise.teamUsage.length ? (
                      <ul>
                        {exercise.teamUsage.map((t) => (
                          <li key={t.team}>
                            {t.team} ({t.uses})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "–"
                    )}
                  </td>
                )}
                {showTeamToggle && (
                  <td className="py-2 pr-3 text-center">
                    <TeamToggle
                      exerciseId={exercise.id}
                      exerciseName={exercise.name}
                      initialActive={exercise.activeInTeam}
                      disabled={!canWrite}
                    />
                  </td>
                )}
                {!showTeamToggle && (
                  <td className="py-2 pr-3 text-center">
                    <PublicToggle
                      exerciseId={exercise.id}
                      exerciseName={exercise.name}
                      initialPublic={exercise.isPublic}
                      disabled={!exercise.editable}
                    />
                  </td>
                )}
                {canWrite && (
                  <td className="py-2 text-right whitespace-nowrap">
                    <div className="flex flex-col items-end gap-1">
                      {exercise.editable && (
                        <div>
                          <Link
                            href={`/exercises/${exercise.id}`}
                            className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
                          >
                            ändern
                          </Link>
                          <form action={remove} className="ml-3 inline">
                            <DeleteButton
                              confirmMessage={`Übung "${exercise.name}" endgültig aus der Übungsdatenbank löschen? Sie verschwindet damit auch bei allen Teams, die sie übernommen haben.`}
                              className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
                            >
                              löschen
                            </DeleteButton>
                          </form>
                        </div>
                      )}
                      <form action={copy}>
                        <CopyButton />
                      </form>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
          {!filtered.length && (
            <tr>
              <td colSpan={10 + (canWrite ? 1 : 0) + (showTeamToggle ? 3 : 1)} className="py-4 text-zinc-500">
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
