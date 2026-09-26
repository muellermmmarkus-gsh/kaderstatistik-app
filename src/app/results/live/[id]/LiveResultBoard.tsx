"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
import { deleteGoalEntry, finishMatch, saveGoalEntry } from "../../actions";
import { scoreOf, type GoalEntry, type GoalKind, type TeamSide } from "../../teams";

export type PlayerOption = { playerId: string; shirtNumber: number | null; name: string };
type Option = { value: string; label: string };

// pick = Auswahl im Dropdown: bei der eigenen Mannschaft die Spieler-ID
// (oder "nr:<Nummer>" ohne Spielerzuordnung), beim Gegner die Nummer.
type SideDraft = { kind: GoalKind; pick: string; note: string };
type Draft = { minute: string; team: TeamSide | null; a: SideDraft; b: SideDraft };

const EMPTY_SIDE: SideDraft = { kind: "goal", pick: "", note: "" };
const EMPTY_DRAFT: Draft = { minute: "", team: null, a: EMPTY_SIDE, b: EMPTY_SIDE };
const NUMBER_OPTIONS = (prefix: string): Option[] =>
  Array.from({ length: 20 }, (_, i) => ({ value: `${prefix}${i + 1}`, label: String(i + 1) }));

// Spalten: Spielminute | Mannschaft A | Mannschaft B | Buttons
const GRID = "grid grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-3";

function pickFromEntry(entry: GoalEntry, ownSide: TeamSide): string {
  if (entry.team === ownSide && entry.playerId) return entry.playerId;
  if (!entry.shirtNumber) return "";
  return entry.team === ownSide ? `nr:${entry.shirtNumber}` : String(entry.shirtNumber);
}

function draftFromEntry(entry: GoalEntry, ownSide: TeamSide): Draft {
  const side: SideDraft = {
    kind: entry.kind,
    pick: pickFromEntry(entry, ownSide),
    note: entry.note,
  };
  return { ...EMPTY_DRAFT, minute: entry.minute, team: entry.team, [entry.team]: side };
}

export default function LiveResultBoard({
  eventId,
  teamA,
  teamB,
  ownSide,
  playerOptions,
  subtitle,
  initialEntries,
  isFinished,
  canWrite,
}: {
  eventId: string;
  teamA: string;
  teamB: string;
  ownSide: TeamSide;
  playerOptions: PlayerOption[];
  subtitle: string;
  initialEntries: GoalEntry[];
  isFinished: boolean;
  canWrite: boolean;
}) {
  // Eigene Mannschaft: "Nummer – Name" aus den Rueckennummern des
  // Spieltermins. Ohne vergebene Nummern nur die Nummern 1-20.
  const ownOptions: Option[] = playerOptions.length
    ? playerOptions.map((p) => ({
        value: p.playerId,
        label: `${p.shirtNumber ?? "–"} – ${p.name}`,
      }))
    : NUMBER_OPTIONS("nr:");
  const optionsFor = (side: TeamSide) => (side === ownSide ? ownOptions : NUMBER_OPTIONS(""));

  const [entries, setEntries] = useState(initialEntries);
  const [newRowKey, setNewRowKey] = useState(0);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [finishing, startFinish] = useTransition();
  const [scoreA, scoreB] = scoreOf(entries);

  // Der Eintragsbereich fuellt die restliche Fensterhoehe unterhalb des
  // Kopfes aus und scrollt selbst, statt die ganze Seite zu scrollen.
  const listRef = useRef<HTMLDivElement>(null);
  const [listMaxHeight, setListMaxHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    function measure() {
      const el = listRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      // 32px = unteres Padding der Seite (py-8)
      setListMaxHeight(Math.max(240, window.innerHeight - top - 32));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Live-Ergebnis</h1>
          <p className="text-sm text-zinc-500">{subtitle}</p>
          {isFinished && (
            <p className="mt-1 text-sm font-medium text-green-700 dark:text-green-400">
              Spiel ist beendet und archiviert – Einträge können weiterhin geändert werden.
            </p>
          )}
          {canWrite && !playerOptions.length && (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              Noch keine Rückennummern vergeben – bitte im{" "}
              <Link href={`/events/${eventId}`} className="underline">
                Spieltermin
              </Link>{" "}
              eintragen, damit hier die Spielernamen erscheinen.
            </p>
          )}
        </div>
        {canWrite &&
          (isFinished ? (
            <Link
              href="/results/recent"
              className="rounded-lg bg-zinc-900 px-6 py-3 text-base font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Fertig
            </Link>
          ) : (
            <button
              type="button"
              disabled={finishing}
              onClick={() => setConfirmFinish(true)}
              className="rounded-lg bg-red-600 px-8 py-4 text-lg font-bold text-white shadow hover:bg-red-700 disabled:opacity-60"
            >
              {finishing ? "Wird archiviert…" : "Spiel beendet"}
            </button>
          ))}
      </div>

      <div className="mb-6 flex items-center justify-center gap-6 rounded-lg border border-zinc-200 py-4 dark:border-zinc-800">
        <span className="flex-1 text-right text-sm font-medium">{teamA}</span>
        <span className="text-4xl font-bold tabular-nums">
          {scoreA} : {scoreB}
        </span>
        <span className="flex-1 text-sm font-medium">{teamB}</span>
      </div>

      {/* Eigener Scrollbereich fuer die Eintraege: Kopf mit Mannschaften und
          Spielstand oben bleibt immer sichtbar, die Spaltenueberschrift klebt
          oben im Scrollbereich. */}
      <div
        ref={listRef}
        style={listMaxHeight ? { maxHeight: listMaxHeight } : undefined}
        className="overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800"
      >
        <div className="min-w-[62rem] space-y-2 px-2 pb-2">
          <div
            className={`${GRID} sticky top-0 z-10 border-b border-zinc-200 bg-background py-2 text-sm font-semibold dark:border-zinc-800`}
          >
            <span className="text-xs font-medium text-zinc-500">Spielminute</span>
            <span>{teamA}</span>
            <span>{teamB}</span>
            <span />
          </div>

          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              eventId={eventId}
              entry={entry}
              ownSide={ownSide}
              optionsFor={optionsFor}
              canWrite={canWrite}
              onSaved={(saved) =>
                setEntries((prev) => prev.map((e) => (e.id === saved.id ? saved : e)))
              }
              onDeleted={(id) => setEntries((prev) => prev.filter((e) => e.id !== id))}
            />
          ))}

          {canWrite && (
            <EntryRow
              key={`new-${newRowKey}`}
              eventId={eventId}
              entry={null}
              ownSide={ownSide}
              optionsFor={optionsFor}
              canWrite
              autoFocus={newRowKey > 0}
              onSaved={(saved) => {
                setEntries((prev) => [...prev, saved]);
                // Neue, leere Zeile fuer den naechsten Eintrag.
                setNewRowKey((k) => k + 1);
              }}
              onDeleted={() => {}}
            />
          )}

          {!canWrite && !entries.length && (
            <p className="py-4 text-sm text-zinc-500">Noch keine Einträge.</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmFinish}
        message="Spiel wirklich beenden und archivieren?"
        confirmLabel="Ja"
        cancelLabel="Nein"
        onCancel={() => setConfirmFinish(false)}
        onConfirm={() => {
          setConfirmFinish(false);
          startFinish(() => finishMatch(eventId));
        }}
      />
    </div>
  );
}

function EntryRow({
  eventId,
  entry,
  ownSide,
  optionsFor,
  canWrite,
  autoFocus = false,
  onSaved,
  onDeleted,
}: {
  eventId: string;
  entry: GoalEntry | null;
  ownSide: TeamSide;
  optionsFor: (side: TeamSide) => Option[];
  canWrite: boolean;
  autoFocus?: boolean;
  onSaved: (entry: GoalEntry) => void;
  onDeleted: (id: string) => void;
}) {
  const isNew = entry === null;
  const [draft, setDraft] = useState<Draft>(entry ? draftFromEntry(entry, ownSide) : EMPTY_DRAFT);
  const [editing, setEditing] = useState(isNew);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const editable = canWrite && editing && !pending;

  // Ein Eintrag gehoert immer zu genau einer Mannschaft: sobald bei einer
  // Mannschaft etwas angeklickt/eingegeben wird, wird die andere Seite
  // zurueckgesetzt.
  function updateSide(side: TeamSide, patch: Partial<SideDraft>) {
    setError(null);
    setDraft((d) => {
      const other: TeamSide = side === "a" ? "b" : "a";
      return {
        ...d,
        team: side,
        [side]: { ...d[side], ...patch },
        [other]: d.team === side ? d[other] : EMPTY_SIDE,
      };
    });
  }

  function save() {
    if (!draft.team) {
      setError("Bitte bei einer Mannschaft Tor oder Eigentor anklicken.");
      return;
    }
    const side = draft[draft.team];
    const isPlayerPick =
      draft.team === ownSide && !!side.pick && !side.pick.startsWith("nr:");
    const shirtNumber =
      side.pick && !isPlayerPick ? Number(side.pick.replace("nr:", "")) : null;
    startTransition(async () => {
      try {
        const saved = await saveGoalEntry(eventId, entry?.id ?? null, {
          minute: draft.minute,
          team: draft.team!,
          kind: side.kind,
          shirtNumber,
          playerId: isPlayerPick ? side.pick : null,
          note: side.note,
        });
        onSaved(saved);
        if (!isNew) {
          setDraft(draftFromEntry(saved, ownSide));
          setEditing(false);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function remove() {
    if (!entry) return;
    setConfirmDelete(false);
    startTransition(async () => {
      try {
        await deleteGoalEntry(eventId, entry.id);
        onDeleted(entry.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      }
    });
  }

  const buttonBase = "rounded px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div
      className={`rounded-lg p-2 ${isNew ? "border border-dashed border-zinc-300 dark:border-zinc-700" : "bg-zinc-50 dark:bg-zinc-900/60"}`}
    >
      <form
        className={GRID}
        onSubmit={(event) => {
          event.preventDefault();
          if (editable) save();
        }}
      >
        <input
          type="text"
          inputMode="numeric"
          placeholder="Min."
          aria-label="Spielminute"
          value={draft.minute}
          disabled={!editable}
          autoFocus={autoFocus}
          onChange={(event) => {
            setError(null);
            setDraft((d) => ({ ...d, minute: event.target.value }));
          }}
          className="w-full rounded border border-zinc-300 px-2 py-2 text-sm disabled:bg-transparent dark:border-zinc-700 dark:bg-zinc-900"
        />

        {(["a", "b"] as const).map((side) => (
          <SideInputs
            key={side}
            value={draft[side]}
            options={optionsFor(side)}
            wide={side === ownSide}
            active={draft.team === side}
            dimmed={draft.team !== null && draft.team !== side}
            disabled={!editable}
            onChange={(patch) => updateSide(side, patch)}
          />
        ))}

        {canWrite ? (
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!editable}
              className={`${buttonBase} bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900`}
            >
              {pending ? "…" : "Speichern"}
            </button>
            <button
              type="button"
              disabled={isNew || pending}
              onClick={() => {
                setError(null);
                if (editing && entry) setDraft(draftFromEntry(entry, ownSide));
                setEditing((v) => !v);
              }}
              className={`${buttonBase} border border-zinc-300 dark:border-zinc-700`}
            >
              {editing && !isNew ? "Abbrechen" : "Ändern"}
            </button>
            <button
              type="button"
              disabled={isNew || pending}
              onClick={() => setConfirmDelete(true)}
              className={`${buttonBase} border border-red-300 text-red-700 dark:border-red-900 dark:text-red-400`}
            >
              Löschen
            </button>
          </div>
        ) : (
          <span />
        )}
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <ConfirmDialog
        open={confirmDelete}
        message="Eintrag wirklich löschen?"
        confirmLabel="Löschen"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </div>
  );
}

function SideInputs({
  value,
  options,
  wide,
  active,
  dimmed,
  disabled,
  onChange,
}: {
  value: SideDraft;
  options: Option[];
  wide: boolean;
  active: boolean;
  dimmed: boolean;
  disabled: boolean;
  onChange: (patch: Partial<SideDraft>) => void;
}) {
  const toggle = (kind: GoalKind, label: string) => {
    const selected = value.kind === kind;
    return (
      <button
        type="button"
        disabled={disabled}
        aria-pressed={active && selected}
        onClick={() => onChange({ kind })}
        className={`px-3 py-2 text-sm ${
          selected && (active || !dimmed)
            ? kind === "goal"
              ? "bg-green-600 text-white"
              : "bg-orange-500 text-white"
            : "bg-white text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        } disabled:cursor-default`}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-lg p-1 transition ${
        active ? "ring-2 ring-green-600" : ""
      } ${dimmed ? "opacity-40" : ""}`}
    >
      <div className="flex shrink-0 overflow-hidden rounded border border-zinc-300 dark:border-zinc-700">
        {toggle("goal", "Tor")}
        {toggle("own_goal", "Eigentor")}
      </div>
      <select
        aria-label="Rückennummer"
        value={value.pick}
        disabled={disabled}
        onChange={(event) => onChange({ pick: event.target.value })}
        className={`${wide ? "w-48" : ""} shrink-0 rounded border border-zinc-300 px-2 py-2 text-sm disabled:bg-transparent dark:border-zinc-700 dark:bg-zinc-900`}
      >
        <option value="">Nr.</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {/* Aelterer Eintrag mit Nummer, die in der Auswahl nicht mehr vorkommt */}
        {value.pick && !options.some((o) => o.value === value.pick) && (
          <option value={value.pick}>{value.pick.replace("nr:", "")}</option>
        )}
      </select>
      <input
        type="text"
        placeholder="Notiz"
        aria-label="Notiz"
        value={value.note}
        disabled={disabled}
        onChange={(event) => onChange({ note: event.target.value })}
        className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-2 text-sm disabled:bg-transparent dark:border-zinc-700 dark:bg-zinc-900"
      />
    </div>
  );
}
