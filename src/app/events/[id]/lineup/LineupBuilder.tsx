"use client";

import { useState } from "react";
import SaveNotice from "@/components/SaveNotice";
import { FORMATIONS, getFormation, getSlots } from "./formations";

type Player = { id: string; first_name: string; last_name: string };

export default function LineupBuilder({
  players,
  initialFormation,
  initialAssignments,
  canWrite,
  action,
}: {
  players: Player[];
  initialFormation?: string;
  initialAssignments: Record<string, string>;
  canWrite: boolean;
  action: (formData: FormData) => void;
}) {
  const [formationKey, setFormationKey] = useState(initialFormation ?? FORMATIONS[0].key);
  const [assignments, setAssignments] = useState<Record<string, string>>(initialAssignments);

  const slots = getSlots(getFormation(formationKey));
  const playerById = new Map(players.map((p) => [p.id, p]));

  // Nur Zuordnungen der aktuell sichtbaren Slots mitschicken - Zuordnungen zu
  // Slots frueherer Formationen (z.B. eine vierte Abwehrposition) sollen
  // beim Speichern nicht unsichtbar weiter mitgefuehrt werden.
  const visibleAssignments: Record<string, string> = {};
  for (const slot of slots) {
    const playerId = assignments[slot.key];
    if (playerId) visibleAssignments[slot.key] = playerId;
  }

  function assignSlot(slotKey: string, playerId: string) {
    setAssignments((prev) => {
      const next = { ...prev };
      if (playerId) next[slotKey] = playerId;
      else delete next[slotKey];
      return next;
    });
  }

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
      <input type="hidden" name="formation" value={formationKey} />
      <input type="hidden" name="assignments" value={JSON.stringify(visibleAssignments)} />

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="formation-select">
          Formation
        </label>
        <select
          id="formation-select"
          value={formationKey}
          onChange={(e) => setFormationKey(e.target.value)}
          disabled={!canWrite}
          className="w-full max-w-xs rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {FORMATIONS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.key}
            </option>
          ))}
        </select>
      </div>

      <div
        className="relative mx-auto w-full max-w-sm overflow-hidden rounded-lg border-2 border-white bg-green-600"
        style={{ aspectRatio: "2 / 3" }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <line x1="3" y1="14" x2="97" y2="14" stroke="white" strokeWidth="0.6" />
          <path
            d="M 38 14 A 12 12 0 0 0 62 14"
            stroke="white"
            strokeWidth="0.6"
            fill="none"
          />
          <rect
            x="25"
            y="78"
            width="50"
            height="21"
            stroke="white"
            strokeWidth="0.6"
            fill="none"
          />
          <rect
            x="38"
            y="90"
            width="24"
            height="9"
            stroke="white"
            strokeWidth="0.6"
            fill="none"
          />
        </svg>

        {slots.map((slot) => {
          const selected = assignments[slot.key] ?? "";
          const selectedPlayer = selected ? playerById.get(selected) : undefined;
          const options = players.filter(
            (p) => p.id === selected || !Object.values(visibleAssignments).includes(p.id),
          );
          return (
            <div
              key={slot.key}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            >
              <select
                value={selected}
                onChange={(e) => assignSlot(slot.key, e.target.value)}
                disabled={!canWrite}
                title={slot.label}
                className="w-28 truncate rounded border border-zinc-400 bg-white px-1.5 py-1 text-center text-xs text-zinc-900 shadow"
              >
                <option value="">– {slot.label} –</option>
                {options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
              {!selectedPlayer && (
                <p className="mt-0.5 text-center text-[10px] text-white/80">{slot.label}</p>
              )}
            </div>
          );
        })}
      </div>

      {canWrite && (
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
