"use client";

import { FORMATIONS, getFormation, getSlots } from "./formations";

type Player = { id: string; first_name: string; last_name: string };

export default function PitchBoard({
  title,
  formationKey,
  onFormationChange,
  assignments,
  onAssign,
  players,
  excludedPlayerIds,
  canWrite,
}: {
  title: string;
  formationKey: string;
  onFormationChange: (key: string) => void;
  assignments: Record<string, string>;
  onAssign: (slotKey: string, playerId: string) => void;
  players: Player[];
  excludedPlayerIds: Set<string>;
  canWrite: boolean;
}) {
  const slots = getSlots(getFormation(formationKey));
  const playerById = new Map(players.map((p) => [p.id, p]));

  return (
    <div className="flex-1">
      <label className="mb-1 block text-sm font-medium">{title}</label>
      <select
        value={formationKey}
        onChange={(e) => onFormationChange(e.target.value)}
        disabled={!canWrite}
        className="w-full max-w-xs rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      >
        {FORMATIONS.map((f) => (
          <option key={f.key} value={f.key}>
            {f.key}
          </option>
        ))}
      </select>

      <div
        className="relative mx-auto mt-3 w-full max-w-sm overflow-hidden rounded-lg border-2 border-white bg-green-600"
        style={{ aspectRatio: "2 / 3" }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <line x1="3" y1="14" x2="97" y2="14" stroke="white" strokeWidth="0.6" />
          <path d="M 38 14 A 12 12 0 0 0 62 14" stroke="white" strokeWidth="0.6" fill="none" />
          <rect x="25" y="78" width="50" height="21" stroke="white" strokeWidth="0.6" fill="none" />
          <rect x="38" y="90" width="24" height="9" stroke="white" strokeWidth="0.6" fill="none" />
        </svg>

        {slots.map((slot) => {
          const selected = assignments[slot.key] ?? "";
          const selectedPlayer = selected ? playerById.get(selected) : undefined;
          const options = players.filter(
            (p) =>
              p.id === selected ||
              (!excludedPlayerIds.has(p.id) && !Object.values(assignments).includes(p.id)),
          );
          return (
            <div
              key={slot.key}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            >
              <select
                value={selected}
                onChange={(e) => onAssign(slot.key, e.target.value)}
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
    </div>
  );
}
