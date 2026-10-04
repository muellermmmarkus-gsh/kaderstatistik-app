"use client";

import { useState, useTransition } from "react";
import { switchTeam } from "@/app/admin/actions";

/** Teamauswahl in der Menueleiste - nur fuer den Admin. */
export default function TeamSwitcher({
  teams,
  currentTeamId,
}: {
  teams: { id: string; name: string }[];
  currentTeamId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <span className="flex min-w-0 items-center gap-1">
      <select
        value={currentTeamId}
        disabled={pending}
        onChange={(event) => {
          const teamId = event.target.value;
          startTransition(async () => {
            const result = await switchTeam(teamId);
            if (result) setError(result);
          });
        }}
        aria-label="Team wechseln"
        title="Team wechseln (nur Admin)"
        className="max-w-40 truncate rounded bg-[#1f4d2c] px-2 py-1 text-sm font-semibold text-white disabled:opacity-60"
      >
        {teams.map((team) => (
          <option key={team.id} value={team.id} className="bg-white text-zinc-900">
            {team.name}
          </option>
        ))}
      </select>
      {pending && <span className="text-xs text-zinc-500">wechselt…</span>}
      {error && (
        <span className="text-xs text-red-600" title={error}>
          Fehler
        </span>
      )}
    </span>
  );
}
