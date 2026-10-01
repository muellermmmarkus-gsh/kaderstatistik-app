"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { renameChecklist, updateChecklistItem } from "../actions";

export type ChecklistEntry = {
  id: string;
  done: boolean;
  note: string;
  kind: "player" | "trainer";
  firstName: string;
  lastName: string;
};

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793ZM11.379 5.793 3 14.172V17h2.828l8.38-8.379-2.83-2.828Z" />
    </svg>
  );
}

function ChecklistTitle({
  checklistId,
  initialName,
  canWrite,
}: {
  checklistId: string;
  initialName: string;
  canWrite: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    const trimmed = draft.trim();
    if (trimmed === name) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await renameChecklist(checklistId, trimmed);
      if (result) {
        setError(result);
        return;
      }
      setName(trimmed);
      setError(null);
      setEditing(false);
    });
  }

  function cancel() {
    setDraft(name);
    setError(null);
    setEditing(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") save();
    if (event.key === "Escape") cancel();
  }

  if (editing) {
    return (
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
            maxLength={100}
            aria-label="Name der Checkliste"
            className="min-w-0 flex-1 rounded border border-zinc-300 px-3 py-1.5 text-xl font-semibold dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
          >
            Abbrechen
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mb-2 flex items-center gap-2">
      <h1 className="text-xl font-semibold">{name}</h1>
      {canWrite && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Namen bearbeiten"
          title="Namen bearbeiten"
          className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <PencilIcon />
        </button>
      )}
    </div>
  );
}

function EntryTable({
  title,
  entries,
  canWrite,
  onToggle,
  onNoteChange,
  onNoteSave,
}: {
  title: string;
  entries: ChecklistEntry[];
  canWrite: boolean;
  onToggle: (entry: ChecklistEntry) => void;
  onNoteChange: (id: string, note: string) => void;
  onNoteSave: (entry: ChecklistEntry) => void;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 font-medium">{title}</h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4 text-center">Erledigt</th>
            <th className="w-full py-2">Kommentar / Notiz</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className={`py-2 pr-4 whitespace-nowrap ${entry.done ? "text-zinc-400 line-through" : ""}`}>
                {entry.firstName} {entry.lastName}
              </td>
              <td className="py-2 pr-4 text-center">
                <input
                  type="checkbox"
                  checked={entry.done}
                  disabled={!canWrite}
                  onChange={() => onToggle(entry)}
                  aria-label={`${entry.firstName} ${entry.lastName} erledigt`}
                  className="h-4 w-4"
                />
              </td>
              <td className="py-2">
                <input
                  type="text"
                  value={entry.note}
                  disabled={!canWrite}
                  maxLength={200}
                  onChange={(event) => onNoteChange(entry.id, event.target.value)}
                  onBlur={() => onNoteSave(entry)}
                  aria-label={`Notiz zu ${entry.firstName} ${entry.lastName}`}
                  className="w-full rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </td>
            </tr>
          ))}
          {!entries.length && (
            <tr>
              <td colSpan={3} className="py-3 text-zinc-500">
                Keine Einträge.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

export default function ChecklistEditor({
  checklistId,
  initialName,
  players,
  trainers,
  canWrite,
}: {
  checklistId: string;
  initialName: string;
  players: ChecklistEntry[];
  trainers: ChecklistEntry[];
  canWrite: boolean;
}) {
  const [entries, setEntries] = useState([...players, ...trainers]);
  const [savedNotes, setSavedNotes] = useState(
    () => new Map([...players, ...trainers].map((e) => [e.id, e.note])),
  );
  const [error, setError] = useState<string | null>(null);

  function patch(id: string, fields: Partial<ChecklistEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...fields } : e)));
  }

  async function toggle(entry: ChecklistEntry) {
    const done = !entry.done;
    patch(entry.id, { done });
    const result = await updateChecklistItem(checklistId, entry.id, { done });
    if (result) {
      patch(entry.id, { done: !done });
      setError(result);
    } else {
      setError(null);
    }
  }

  async function saveNote(entry: ChecklistEntry) {
    if (savedNotes.get(entry.id) === entry.note) return;
    const result = await updateChecklistItem(checklistId, entry.id, { note: entry.note });
    if (result) {
      setError(result);
    } else {
      setSavedNotes((prev) => new Map(prev).set(entry.id, entry.note));
      setError(null);
    }
  }

  const doneCount = entries.filter((e) => e.done).length;
  const pct = entries.length ? Math.round((doneCount / entries.length) * 100) : 0;

  return (
    <>
      <ChecklistTitle checklistId={checklistId} initialName={initialName} canWrite={canWrite} />
      <p className="mb-6 text-sm text-zinc-500">
        {doneCount} von {entries.length} erledigt ({pct} %)
        {canWrite && " · Änderungen werden automatisch gespeichert."}
      </p>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <EntryTable
        title="Spieler"
        entries={entries.filter((e) => e.kind === "player")}
        canWrite={canWrite}
        onToggle={toggle}
        onNoteChange={(id, note) => patch(id, { note })}
        onNoteSave={saveNote}
      />
      <EntryTable
        title="Trainer"
        entries={entries.filter((e) => e.kind === "trainer")}
        canWrite={canWrite}
        onToggle={toggle}
        onNoteChange={(id, note) => patch(id, { note })}
        onNoteSave={saveNote}
      />
    </>
  );
}
