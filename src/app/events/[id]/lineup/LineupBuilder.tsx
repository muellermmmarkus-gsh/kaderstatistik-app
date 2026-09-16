"use client";

import { useState } from "react";
import SaveNotice from "@/components/SaveNotice";
import { FORMATIONS, getFormation, getSlots } from "./formations";
import PitchBoard from "./PitchBoard";

type Player = { id: string; first_name: string; last_name: string };

// Nur Zuordnungen der aktuell sichtbaren Slots einer Formation
// weiterreichen - Zuordnungen zu Slots frueherer Formationen (z.B. eine
// vierte Abwehrposition) sollen beim Speichern nicht unsichtbar
// weiter mitgefuehrt werden.
function visibleAssignmentsFor(
  formationKey: string,
  assignments: Record<string, string>,
): Record<string, string> {
  const visible: Record<string, string> = {};
  for (const slot of getSlots(getFormation(formationKey))) {
    const playerId = assignments[slot.key];
    if (playerId) visible[slot.key] = playerId;
  }
  return visible;
}

export default function LineupBuilder({
  players,
  initialFormation,
  initialAssignments,
  initialBenchFormation,
  initialBenchAssignments,
  canWrite,
  action,
}: {
  players: Player[];
  initialFormation?: string;
  initialAssignments: Record<string, string>;
  initialBenchFormation?: string;
  initialBenchAssignments: Record<string, string>;
  canWrite: boolean;
  action: (formData: FormData) => void;
}) {
  const [formationKey, setFormationKey] = useState(initialFormation ?? FORMATIONS[0].key);
  const [assignments, setAssignments] = useState<Record<string, string>>(initialAssignments);
  const [benchFormationKey, setBenchFormationKey] = useState(
    initialBenchFormation ?? FORMATIONS[0].key,
  );
  const [benchAssignments, setBenchAssignments] = useState<Record<string, string>>(
    initialBenchAssignments,
  );

  const visible = visibleAssignmentsFor(formationKey, assignments);
  const visibleBench = visibleAssignmentsFor(benchFormationKey, benchAssignments);

  const usedOnPitch = new Set(Object.values(visible));
  const usedOnBench = new Set(Object.values(visibleBench));

  function assignSlot(slotKey: string, playerId: string) {
    setAssignments((prev) => {
      const next = { ...prev };
      if (playerId) next[slotKey] = playerId;
      else delete next[slotKey];
      return next;
    });
  }

  function assignBenchSlot(slotKey: string, playerId: string) {
    setBenchAssignments((prev) => {
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
      <input type="hidden" name="assignments" value={JSON.stringify(visible)} />
      <input type="hidden" name="bench_formation" value={benchFormationKey} />
      <input type="hidden" name="bench_assignments" value={JSON.stringify(visibleBench)} />

      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        <PitchBoard
          title="Startaufstellung"
          formationKey={formationKey}
          onFormationChange={setFormationKey}
          assignments={visible}
          onAssign={assignSlot}
          players={players}
          excludedPlayerIds={usedOnBench}
          canWrite={canWrite}
        />
        <PitchBoard
          title="Ersatzbank"
          formationKey={benchFormationKey}
          onFormationChange={setBenchFormationKey}
          assignments={visibleBench}
          onAssign={assignBenchSlot}
          players={players}
          excludedPlayerIds={usedOnPitch}
          canWrite={canWrite}
        />
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
