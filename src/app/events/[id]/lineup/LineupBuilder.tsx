"use client";

import { useState } from "react";
import SaveNotice from "@/components/SaveNotice";
import {
  DEFAULT_GAME_MODE,
  GAME_MODES,
  gameModeLabel,
  getFormation,
  getSlots,
  type GameMode,
} from "./formations";
import PitchBoard from "./PitchBoard";

type Player = { id: string; first_name: string; last_name: string };

// Nur Zuordnungen der aktuell sichtbaren Slots einer Formation
// weiterreichen - Zuordnungen zu Slots frueherer Formationen (z.B. eine
// vierte Abwehrposition) sollen beim Speichern nicht unsichtbar
// weiter mitgefuehrt werden.
function visibleAssignmentsFor(
  formationKey: string,
  mode: GameMode,
  assignments: Record<string, string>,
): Record<string, string> {
  const visible: Record<string, string> = {};
  for (const slot of getSlots(getFormation(formationKey, mode))) {
    const playerId = assignments[slot.key];
    if (playerId) visible[slot.key] = playerId;
  }
  return visible;
}

type Board = { formation: string; assignments: Record<string, string> };
const BOARD_TITLES = ["Startaufstellung", "Ersatzbank", "3. Formation"];

export default function LineupBuilder({
  players,
  isTournament,
  initialMode,
  initialBoards,
  canWrite,
  action,
}: {
  players: Player[];
  /** Bei Turnieren wird zuerst der Spielmodus gewaehlt, Spiele laufen immer 6+1. */
  isTournament: boolean;
  initialMode: GameMode | null;
  /** Start, Ersatzbank, 3. Formation */
  initialBoards: { formation?: string | null; assignments: Record<string, string> }[];
  canWrite: boolean;
  action: (formData: FormData) => void;
}) {
  const [mode, setMode] = useState<GameMode | null>(
    isTournament ? initialMode : DEFAULT_GAME_MODE,
  );
  const [boards, setBoards] = useState<Board[]>(() =>
    BOARD_TITLES.map((_, i) => ({
      formation: getFormation(initialBoards[i]?.formation ?? "", initialMode ?? DEFAULT_GAME_MODE).key,
      assignments: initialBoards[i]?.assignments ?? {},
    })),
  );

  function changeMode(next: GameMode) {
    setMode(next);
    // Formationen auf den neuen Modus umstellen (gleiche Formation, sonst die erste).
    setBoards((prev) => prev.map((b) => ({ ...b, formation: getFormation(b.formation, next).key })));
  }

  function updateBoard(index: number, patch: Partial<Board>) {
    setBoards((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function assignSlot(index: number, slotKey: string, playerId: string) {
    setBoards((prev) =>
      prev.map((b, i) => {
        if (i !== index) return b;
        const next = { ...b.assignments };
        if (playerId) next[slotKey] = playerId;
        else delete next[slotKey];
        return { ...b, assignments: next };
      }),
    );
  }

  const activeMode = mode ?? DEFAULT_GAME_MODE;
  const visible = boards.map((b) => visibleAssignmentsFor(b.formation, activeMode, b.assignments));
  const usedOn = visible.map((v) => new Set(Object.values(v)));
  // Ein Spieler steht in hoechstens einer der drei Formationen.
  const excludedFor = (index: number) =>
    new Set(usedOn.flatMap((set, i) => (i === index ? [] : [...set])));

  const names = ["", "bench_", "third_"];

  return (
    <form
      ref={(el) => {
        // React 19 ruft nach einer erfolgreichen Form-Action automatisch
        // el.reset() auf - das wuerde die kontrollierten Felder (Formation,
        // Positions-Auswahl) sichtbar auf ihren Browser-Default zuruecksetzen,
        // obwohl State und Datenbank weiterhin den richtigen Wert haben.
        if (el) el.reset = () => {};
      }}
      action={action}
      className="space-y-6"
    >
      <input type="hidden" name="game_mode" value={activeMode} />
      {boards.map((b, i) => (
        <span key={i}>
          <input type="hidden" name={`${names[i]}formation`} value={b.formation} />
          <input type="hidden" name={`${names[i]}assignments`} value={JSON.stringify(visible[i])} />
        </span>
      ))}

      {isTournament && (
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="game-mode">
            Spielmodus
          </label>
          <select
            id="game-mode"
            value={mode ?? ""}
            onChange={(e) => changeMode(Number(e.target.value) as GameMode)}
            disabled={!canWrite}
            className="w-full max-w-xs rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {mode === null && <option value="">– bitte wählen –</option>}
            {GAME_MODES.map((m) => (
              <option key={m} value={m}>
                {gameModeLabel(m)} ({m} Feldspieler + Torwart)
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === null ? (
        <p className="text-sm text-zinc-500">
          Bitte zuerst den Spielmodus wählen, danach die Formationen.
        </p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {BOARD_TITLES.map((title, i) => (
            <PitchBoard
              key={title}
              title={title}
              mode={mode}
              formationKey={boards[i].formation}
              onFormationChange={(formation) => updateBoard(i, { formation })}
              assignments={visible[i]}
              onAssign={(slotKey, playerId) => assignSlot(i, slotKey, playerId)}
              players={players}
              excludedPlayerIds={excludedFor(i)}
              canWrite={canWrite}
            />
          ))}
        </div>
      )}

      {canWrite && mode !== null && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Speichern
          </button>
          <SaveNotice />
        </div>
      )}
    </form>
  );
}
