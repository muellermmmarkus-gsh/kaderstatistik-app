import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import BackButton from "@/components/BackButton";
import DeleteConfirmButton from "@/components/DeleteConfirmButton";
import SavedQueryNotice from "@/components/SavedQueryNotice";
import { deleteMatchResult } from "../actions";
import { scoreOf, type GoalKind, type TeamSide } from "../teams";

type EntryRow = {
  minute: string | null;
  team: TeamSide;
  kind: GoalKind;
  shirt_number: number | null;
  note: string | null;
  created_at: string;
};

type ResultRow = {
  id: string;
  event_id: string;
  team_a: string;
  team_b: string;
  finished_at: string;
  events: { event_date: string; event_time: string | null; deleted_at: string | null } | null;
  match_goal_entries: EntryRow[];
};

function describeEntry(entry: EntryRow, teamA: string, teamB: string): string {
  const parts = [
    entry.minute ? `${entry.minute}'` : null,
    entry.shirt_number ? `#${entry.shirt_number}` : null,
    entry.kind === "own_goal" ? "Eigentor" : "Tor",
    entry.note?.trim() || null,
    `(${entry.team === "a" ? teamA : teamB})`,
  ];
  return parts.filter(Boolean).join(" ");
}

export default async function RecentResultsPage() {
  const supabase = await createClient();

  const [{ data }, canWrite] = await Promise.all([
    supabase
      .from("match_results")
      .select(
        "id, event_id, team_a, team_b, finished_at, events(event_date, event_time, deleted_at), match_goal_entries(minute, team, kind, shirt_number, note, created_at)",
      )
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false }),
    isTrainer(),
  ]);

  // Ergebnisse zu geloeschten Terminen (Soft-Delete) ausblenden.
  const results = ((data as ResultRow[] | null) ?? []).filter(
    (r) => r.events && !r.events.deleted_at,
  );

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <h1 className="mb-6 text-xl font-semibold">Letzte Ergebnisse</h1>
      <SavedQueryNotice />

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2 pr-6">Datum</th>
            <th className="py-2 pr-4">Spiel</th>
            <th className="py-2 pr-4 text-center">Ergebnis</th>
            {canWrite && <th className="py-2" />}
          </tr>
        </thead>
        <tbody>
          {results.map((result) => {
            const entries = [...result.match_goal_entries].sort((x, y) =>
              x.created_at.localeCompare(y.created_at),
            );
            const [scoreA, scoreB] = scoreOf(entries);
            const remove = deleteMatchResult.bind(null, result.id, result.event_id);
            return (
              <tr
                key={result.id}
                className="border-b border-zinc-100 align-top dark:border-zinc-900"
              >
                <td className="whitespace-nowrap py-3 pr-6">
                  {result.events!.event_date}
                  {result.events!.event_time && (
                    <span className="block text-xs text-zinc-500">
                      {result.events!.event_time.slice(0, 5)} Uhr
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <div className="font-medium">
                    {result.team_a} – {result.team_b}
                  </div>
                  {entries.length > 0 && (
                    <div className="mt-1 text-xs text-zinc-500">
                      {entries.map((e) => describeEntry(e, result.team_a, result.team_b)).join(" · ")}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap py-3 pr-4 text-center text-lg font-bold tabular-nums">
                  {scoreA} : {scoreB}
                </td>
                {canWrite && (
                  <td className="whitespace-nowrap py-3 text-right">
                    <Link
                      href={`/results/live/${result.event_id}`}
                      className="mr-3 text-zinc-600 hover:underline dark:text-zinc-400"
                    >
                      Ändern
                    </Link>
                    <form action={remove} className="inline">
                      <DeleteConfirmButton
                        message="Eintrag wirklich löschen?"
                        triggerLabel="Löschen"
                        confirmLabel="Löschen"
                        triggerClassName="text-red-700 hover:underline dark:text-red-400"
                      />
                    </form>
                  </td>
                )}
              </tr>
            );
          })}
          {!results.length && (
            <tr>
              <td colSpan={canWrite ? 4 : 3} className="py-4 text-zinc-500">
                Noch keine beendeten Spiele.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
