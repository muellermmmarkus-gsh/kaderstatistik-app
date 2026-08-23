"use client";

import { useRef, useState } from "react";
import { categoryLabels } from "@/app/exercises/categoryLabels";
import SaveNotice from "@/components/SaveNotice";

const GROUP_OPTIONS = ["A", "B", "C", "D", "E", "F"] as const;
const BLOCK_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Exercise = {
  id: string;
  name: string;
  hauptzweck: string;
  nebenzweck: string | null;
  min_players: number;
  max_players: number;
  small_goals: number;
  mini_goals: number;
  category: string;
  image_url?: string | null;
  source_url?: string | null;
  fields?: { name: string; length_m: number; width_m: number } | null;
};

// Die Schwerpunkt-Eingrenzung gilt nur fuer Uebungs-/Spielformen, nicht fuer
// Aufwaermen/Cool-down, da dort Schwerpunkte selten trennscharf gepflegt sind.
function focusAppliesToCategory(category: string): boolean {
  return category === "ueben" || category === "spielen";
}

function exerciseMatchesFocus(exercise: Exercise | undefined, focus: string): boolean {
  if (!exercise) return false;
  if (!focus) return true;
  return exercise.hauptzweck === focus || exercise.nebenzweck === focus;
}

type Player = { id: string; first_name: string; last_name: string };

type Row = {
  key: string;
  category: string;
  exerciseId: string;
  duration: number;
  block: number;
  groups: string[];
};

function nextBlock(rows: Row[]): number {
  const used = new Set(rows.map((r) => r.block));
  for (const b of BLOCK_OPTIONS) {
    if (!used.has(b)) return b;
  }
  return BLOCK_OPTIONS[0];
}

function makeRow(block: number): Row {
  return {
    key: crypto.randomUUID(),
    category: "",
    exerciseId: "",
    duration: 15,
    block,
    groups: [""],
  };
}

export default function TrainingBuilder({
  exercises,
  players,
  focuses,
  action,
  initialFocus,
  initialNotes,
  initialRows,
  initialPlayerGroups,
  submitLabel,
}: {
  exercises: Exercise[];
  players: Player[];
  focuses: string[];
  action: (formData: FormData) => void;
  initialFocus?: string;
  initialNotes?: string;
  initialRows?: { exerciseId: string; duration: number; block: number; groups: string[] }[];
  initialPlayerGroups?: { playerId: string; group: string }[];
  submitLabel: string;
}) {
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));

  const formRef = useRef<HTMLFormElement>(null);
  const redirectInputRef = useRef<HTMLInputElement>(null);

  const [trainingFocus, setTrainingFocus] = useState(initialFocus ?? "");

  const [rows, setRows] = useState<Row[]>(() =>
    initialRows?.length
      ? initialRows.map((row) => ({
          ...row,
          key: crypto.randomUUID(),
          category: exerciseById.get(row.exerciseId)?.category ?? "",
          groups: row.groups.length ? row.groups : [""],
        }))
      : [makeRow(1)],
  );

  const [playerGroups, setPlayerGroups] = useState<Map<string, string>>(
    () => new Map((initialPlayerGroups ?? []).map((pg) => [pg.playerId, pg.group])),
  );

  const availableGroups = GROUP_OPTIONS.filter((g) =>
    [...playerGroups.values()].includes(g),
  );

  const allPlayersSameGroup =
    players.length > 0 &&
    players.every((p) => {
      const g = playerGroups.get(p.id);
      return !!g && g === playerGroups.get(players[0].id);
    });

  // Zeilen nach Trainingsblock gruppieren, Reihenfolge nach erstem Auftreten des Blocks.
  const blockOrder: number[] = [];
  const rowsByBlock = new Map<number, Row[]>();
  for (const row of rows) {
    if (!rowsByBlock.has(row.block)) {
      blockOrder.push(row.block);
      rowsByBlock.set(row.block, []);
    }
    rowsByBlock.get(row.block)!.push(row);
  }

  const totalMinutes = blockOrder.reduce(
    (sum, block) => sum + (rowsByBlock.get(block)![0]?.duration || 0),
    0,
  );

  // Zeilen ohne eigene Dauer (nicht erste Übung im Block) übernehmen die Dauer
  // der ersten Übung des Blocks – dieselbe Regel wie beim ausgegrauten Feld.
  const effectiveDuration = new Map<string, number>();
  for (const block of blockOrder) {
    const blockRows = rowsByBlock.get(block)!;
    const duration = blockRows[0]?.duration || 0;
    for (const r of blockRows) effectiveDuration.set(r.key, duration);
  }

  const totalsByCategory = new Map<string, number>();
  for (const row of rows) {
    if (!row.category) continue;
    totalsByCategory.set(
      row.category,
      (totalsByCategory.get(row.category) ?? 0) + (effectiveDuration.get(row.key) ?? 0),
    );
  }

  // Sind mehrere Gruppen angelegt, Kategorie-Summen zusaetzlich je Gruppe aufschluesseln.
  // Uebungen ohne eigene Gruppenauswahl gelten fuer alle Gruppen.
  const categoryTotalsByGroup = new Map<string, Map<string, number>>();
  if (availableGroups.length > 1) {
    for (const row of rows) {
      if (!row.category) continue;
      const duration = effectiveDuration.get(row.key) ?? 0;
      const rowGroups = row.groups.filter((g): g is string => Boolean(g));
      const targetGroups = rowGroups.length
        ? rowGroups.filter((g) => (availableGroups as readonly string[]).includes(g))
        : availableGroups;
      const catMap = categoryTotalsByGroup.get(row.category) ?? new Map<string, number>();
      for (const g of targetGroups) {
        catMap.set(g, (catMap.get(g) ?? 0) + duration);
      }
      categoryTotalsByGroup.set(row.category, catMap);
    }
  }

  const usedFields = new Map<string, { name: string; length_m: number; width_m: number }>();
  for (const row of rows) {
    const field = exerciseById.get(row.exerciseId)?.fields;
    if (field) usedFields.set(`${field.name}-${field.length_m}-${field.width_m}`, field);
  }

  function addRow() {
    setRows((prev) => [...prev, makeRow(nextBlock(prev))]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function changeCategory(key: string, category: string) {
    const applyFocus = focusAppliesToCategory(category);
    const firstMatch = exercises.find(
      (ex) => ex.category === category && (!applyFocus || exerciseMatchesFocus(ex, trainingFocus)),
    );
    updateRow(key, { category, exerciseId: firstMatch?.id ?? "" });
  }

  function changeFocus(focus: string) {
    setTrainingFocus(focus);
    setRows((prev) =>
      prev.map((r) => {
        if (!focusAppliesToCategory(r.category)) return r;
        if (exerciseMatchesFocus(exerciseById.get(r.exerciseId), focus)) return r;
        const firstMatch = exercises.find(
          (ex) => ex.category === r.category && exerciseMatchesFocus(ex, focus),
        );
        return { ...r, exerciseId: firstMatch?.id ?? "" };
      }),
    );
  }

  function updateRowGroup(key: string, index: number, value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key ? { ...r, groups: r.groups.map((g, i) => (i === index ? value : g)) } : r,
      ),
    );
  }

  function addGroupSlot(key: string) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, groups: [...r.groups, ""] } : r)),
    );
  }

  function removeGroupSlot(key: string, index: number) {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key && r.groups.length > 1
          ? { ...r, groups: r.groups.filter((_, i) => i !== index) }
          : r,
      ),
    );
  }

  function goToExercise(exerciseId: string) {
    const exercisePath = `/exercises/${exerciseId}`;
    const shouldSave = window.confirm(
      "Sollen alle Änderungen in der Trainingsplanung gespeichert werden, bevor du zur Übung wechselst?",
    );
    if (shouldSave) {
      if (redirectInputRef.current) redirectInputRef.current.value = exercisePath;
      formRef.current?.requestSubmit();
    } else {
      window.location.assign(exercisePath);
    }
  }

  function toggleSameGroup(checked: boolean) {
    if (checked) {
      setPlayerGroups(new Map(players.map((p) => [p.id, "A"])));
    } else {
      setPlayerGroups(new Map());
    }
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <form ref={formRef} action={action} className="flex-1 space-y-6">
        <input type="hidden" name="afterSaveRedirect" ref={redirectInputRef} />
        <div className="flex flex-wrap gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium" htmlFor="focus">
              Schwerpunkt Training
            </label>
            <select
              id="focus"
              name="focus"
              value={trainingFocus}
              onChange={(e) => changeFocus(e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Kein Schwerpunkt</option>
              {focuses.map((focus) => (
                <option key={focus} value={focus}>
                  {focus}
                </option>
              ))}
            </select>
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
          {blockOrder.map((block) => {
            const blockRows = rowsByBlock.get(block)!;
            const grouped = blockRows.length > 1;
            const groupCounts = new Map<string, number>();
            for (const r of blockRows) {
              for (const g of r.groups) {
                if (!g) continue;
                groupCounts.set(g, (groupCounts.get(g) ?? 0) + 1);
              }
            }

            return (
              <div
                key={block}
                className={
                  grouped
                    ? "space-y-3 rounded-lg border-2 border-blue-200 bg-blue-50/40 p-3 dark:border-blue-900 dark:bg-blue-950/20"
                    : "space-y-3"
                }
              >
                {blockRows.map((row, indexInBlock) => {
                  const exercise = exerciseById.get(row.exerciseId);
                  const categoryExercises = row.category
                    ? exercises.filter(
                        (ex) =>
                          ex.category === row.category &&
                          (!focusAppliesToCategory(row.category) ||
                            exerciseMatchesFocus(ex, trainingFocus)),
                      )
                    : [];
                  const isFirstInBlock = indexInBlock === 0;
                  const displayDuration = isFirstInBlock ? row.duration : blockRows[0].duration;

                  return (
                    <div
                      key={row.key}
                      className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                    >
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Trainingsblock
                          </label>
                          <select
                            name="block"
                            value={row.block}
                            onChange={(e) =>
                              updateRow(row.key, { block: Number(e.target.value) })
                            }
                            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            {BLOCK_OPTIONS.map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>
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
                        <div>
                          <label className="mb-1 block text-sm font-medium">Gruppe</label>
                          <div className="flex items-center gap-1">
                            {row.groups.map((g, groupIndex) => {
                              const conflict = !!g && (groupCounts.get(g) ?? 0) > 1;
                              return (
                                <div key={groupIndex} className="flex items-center gap-1">
                                  <select
                                    value={g}
                                    onChange={(e) =>
                                      updateRowGroup(row.key, groupIndex, e.target.value)
                                    }
                                    className={`rounded border px-2 py-2 text-sm dark:bg-zinc-900 ${
                                      conflict
                                        ? "border-red-500 ring-1 ring-red-500"
                                        : "border-zinc-300 dark:border-zinc-700"
                                    }`}
                                  >
                                    <option value="">–</option>
                                    {availableGroups.map((gr) => (
                                      <option key={gr} value={gr}>
                                        {gr}
                                      </option>
                                    ))}
                                  </select>
                                  {groupIndex > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => removeGroupSlot(row.key, groupIndex)}
                                      className="text-xs text-zinc-400 hover:text-zinc-600"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => addGroupSlot(row.key)}
                              className="whitespace-nowrap text-xs text-zinc-500 hover:underline"
                            >
                              + weitere Gruppe
                            </button>
                          </div>
                          <input
                            type="hidden"
                            name="groups"
                            value={row.groups.filter(Boolean).join(",")}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium">Dauer (min)</label>
                          <input
                            type="number"
                            name="duration_minutes"
                            min={1}
                            value={displayDuration}
                            readOnly={!isFirstInBlock}
                            tabIndex={isFirstInBlock ? undefined : -1}
                            onChange={(e) => {
                              if (isFirstInBlock) {
                                updateRow(row.key, { duration: Number(e.target.value) });
                              }
                            }}
                            className={`w-24 rounded border px-3 py-2 ${
                              isFirstInBlock
                                ? "border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
                                : "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-500"
                            }`}
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex items-start gap-3">
                        <div className="flex-1">
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
                          {exercise && (
                            <div className="mt-1 flex gap-3 text-xs">
                              {exercise.source_url && (
                                <a
                                  href={exercise.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-zinc-500 hover:underline dark:text-zinc-400"
                                >
                                  externe URL
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => goToExercise(exercise.id)}
                                className="text-zinc-500 hover:underline dark:text-zinc-400"
                              >
                                interne URL
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {exercise?.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- externe Supabase-Storage-URL
                            <img
                              src={exercise.image_url}
                              alt=""
                              className="h-24 w-24 shrink-0 rounded border border-zinc-300 object-cover dark:border-zinc-700"
                            />
                          ) : (
                            <div className="h-24 w-24 shrink-0 rounded border border-dashed border-zinc-300 dark:border-zinc-700" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeRow(row.key)}
                            disabled={rows.length === 1}
                            className="text-sm text-zinc-600 hover:underline disabled:opacity-40 dark:text-zinc-400"
                          >
                            entfernen
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-end gap-3">
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
                          <label className="mb-1 block text-sm font-medium">
                            Kleinfeldtore
                          </label>
                          <p className="w-24 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                            {exercise ? exercise.small_goals : "–"}
                          </p>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium">Minitore</label>
                          <p className="w-24 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                            {exercise ? exercise.mini_goals : "–"}
                          </p>
                        </div>
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
        <SaveNotice />
      </form>

      <aside className="w-full shrink-0 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800 md:w-72">
        <h2 className="mb-3 font-medium">Dauer nach Kategorie</h2>
        {availableGroups.length > 1 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-1 pr-2">Kategorie</th>
                  {availableGroups.map((g) => (
                    <th key={g} className="py-1 pr-2 text-right">
                      {g}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <tr key={value} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-1 pr-2 text-zinc-500">{label}</td>
                    {availableGroups.map((g) => (
                      <td key={g} className="py-1 pr-2 text-right">
                        {categoryTotalsByGroup.get(value)?.get(g) ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-200 font-medium dark:border-zinc-800">
                  <td className="py-2 pr-2">Gesamt</td>
                  {availableGroups.map((g) => {
                    const groupTotal = Object.keys(categoryLabels).reduce(
                      (sum, value) => sum + (categoryTotalsByGroup.get(value)?.get(g) ?? 0),
                      0,
                    );
                    return (
                      <td key={g} className="py-2 pr-2 text-right">
                        {groupTotal}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <ul className="space-y-1">
            {Object.entries(categoryLabels).map(([value, label]) => (
              <li key={value} className="flex justify-between">
                <span className="text-zinc-500">{label}</span>
                <span>{totalsByCategory.get(value) ?? 0} min</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex justify-between border-t border-zinc-200 pt-2 font-medium dark:border-zinc-800">
          <span>Gesamt</span>
          <span>{totalMinutes} min</span>
        </div>

        <h2 className="mb-3 mt-6 font-medium">Benötigte Übungsflächen</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-1">Name</th>
              <th className="py-1">Länge</th>
              <th className="py-1">Breite</th>
            </tr>
          </thead>
          <tbody>
            {[...usedFields.values()].map((field) => (
              <tr
                key={field.name}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-1">{field.name}</td>
                <td className="py-1 text-zinc-500">{field.length_m} m</td>
                <td className="py-1 text-zinc-500">{field.width_m} m</td>
              </tr>
            ))}
            {!usedFields.size && (
              <tr>
                <td colSpan={3} className="py-2 text-zinc-500">
                  Keine Übungsfläche hinterlegt.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <h2 className="mb-3 mt-6 font-medium">Spielergruppen</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-1">Spieler</th>
              <th className="py-1">Gruppe</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-1" colSpan={2}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allPlayersSameGroup}
                    onChange={(e) => toggleSameGroup(e.target.checked)}
                  />
                  alle Spieler eine Gruppe
                </label>
              </td>
            </tr>
            {players.map((p) => (
              <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-1">
                  {p.first_name} {p.last_name}
                  <input type="hidden" name="player_id" value={p.id} />
                </td>
                <td className="py-1">
                  <select
                    name="player_group"
                    value={playerGroups.get(p.id) ?? ""}
                    onChange={(e) =>
                      setPlayerGroups((prev) => new Map(prev).set(p.id, e.target.value))
                    }
                    className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="">–</option>
                    {GROUP_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {!players.length && (
              <tr>
                <td colSpan={2} className="py-2 text-zinc-500">
                  Keine Spieler angelegt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </aside>
    </div>
  );
}
