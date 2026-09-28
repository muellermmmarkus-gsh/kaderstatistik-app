import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import BackButton from "@/components/BackButton";
import SaveNotice from "@/components/SaveNotice";
import { saveMatchReport } from "../../actions";
import { scoreOf, sortByMinute, type GoalKind, type TeamSide } from "../../teams";

type EntryRow = {
  minute: string | null;
  team: TeamSide;
  kind: GoalKind;
  shirt_number: number | null;
  note: string | null;
  created_at: string;
  players: { first_name: string; last_name: string } | null;
};

function scorerLabel(entry: EntryRow): { name: string; extra: string | null } {
  const note = entry.note?.trim() || null;
  const name = entry.players
    ? `${entry.players.first_name} ${entry.players.last_name}`
    : entry.shirt_number
      ? `#${entry.shirt_number}`
      : null;
  const prefix = entry.kind === "own_goal" ? "Eigentor " : "";
  if (name) return { name: `${prefix}${name}`, extra: note };
  if (note) return { name: `${prefix}${note}`, extra: null };
  return { name: entry.kind === "own_goal" ? "Eigentor" : "k.A.", extra: null };
}

export default async function MatchReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: event }, { data: result }, canWrite] = await Promise.all([
    supabase
      .from("events")
      .select("event_date, event_time, location")
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("match_results")
      .select(
        "id, team_a, team_b, report, match_goal_entries(minute, team, kind, shirt_number, note, created_at, players(first_name, last_name))",
      )
      .eq("event_id", id)
      .maybeSingle(),
    isTrainer(),
  ]);

  if (!event || !result) notFound();

  // Zwischenstand chronologisch berechnen (Eintraege ohne Minute in
  // Erfassungsreihenfolge nach den anderen), angezeigt wird wie bei bfv.de
  // umgekehrt: das letzte Tor oben, das erste unten.
  const entries = sortByMinute(
    [...((result.match_goal_entries ?? []) as unknown as EntryRow[])].sort((x, y) =>
      x.created_at.localeCompare(y.created_at),
    ),
  );
  let a = 0;
  let b = 0;
  const timeline = entries.map((entry) => {
    // Ein Eigentor erscheint auf der Seite der Mannschaft, die davon profitiert.
    const scoringSide: TeamSide =
      entry.kind === "goal" ? entry.team : entry.team === "a" ? "b" : "a";
    if (scoringSide === "a") a++;
    else b++;
    return { entry, scoringSide, score: `${a}:${b}`, ...scorerLabel(entry) };
  }).reverse();
  const [scoreA, scoreB] = scoreOf(entries);

  const save = saveMatchReport.bind(null, result.id as string);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <BackButton href="/results/recent" />

      <div className="mb-8 rounded-lg bg-gradient-to-b from-blue-800 to-blue-600 px-4 py-6 text-white">
        <p className="mb-3 text-center text-sm text-blue-100">
          {event.event_date}
          {event.event_time ? ` / ${event.event_time.slice(0, 5)} Uhr` : ""}
          {event.location ? ` · ${event.location}` : ""}
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <span className="text-right text-lg font-bold sm:text-xl">{result.team_a}</span>
          <span className="text-5xl font-bold tabular-nums">
            {scoreA}:{scoreB}
          </span>
          <span className="text-lg font-bold sm:text-xl">{result.team_b}</span>
        </div>
      </div>

      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        <section className="md:w-1/2">
          <h2 className="mb-3 font-medium">Spielverlauf</h2>
          {timeline.length ? (
            <div className="rounded-lg border border-zinc-200 py-2 text-sm dark:border-zinc-800">
              {timeline.map(({ entry, scoringSide, score, name, extra }, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_2.5rem_3rem_2.5rem_1fr] items-center gap-2 px-3 py-1.5"
                >
                  {/* Mannschaft A links, Zwischenstand in der Mitte, Mannschaft B rechts */}
                  <span className="text-right">
                    {scoringSide === "a" && (
                      <>
                        {name}
                        {extra && <span className="block text-xs text-zinc-500">{extra}</span>}
                      </>
                    )}
                  </span>
                  <span className="text-right text-zinc-500 tabular-nums">
                    {scoringSide === "a" && entry.minute ? `${entry.minute}'` : ""}
                  </span>
                  <span className="text-center font-bold tabular-nums">{score}</span>
                  <span className="text-zinc-500 tabular-nums">
                    {scoringSide === "b" && entry.minute ? `${entry.minute}'` : ""}
                  </span>
                  <span>
                    {scoringSide === "b" && (
                      <>
                        {name}
                        {extra && <span className="block text-xs text-zinc-500">{extra}</span>}
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Keine Tore eingetragen.</p>
          )}
        </section>

        <section className="md:w-1/2">
          <h2 className="mb-3 font-medium">Spielbericht</h2>
          {canWrite ? (
            <form action={save} className="space-y-3">
              <textarea
                name="report"
                rows={20}
                defaultValue={result.report ?? ""}
                placeholder="Eindrücke, Stärken, Schwächen, besondere Szenen …"
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="submit"
                className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Speichern
              </button>
              <SaveNotice />
            </form>
          ) : result.report ? (
            <p className="whitespace-pre-wrap rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
              {result.report}
            </p>
          ) : (
            <p className="text-sm text-zinc-500">Noch kein Spielbericht erfasst.</p>
          )}
        </section>
      </div>
    </div>
  );
}
