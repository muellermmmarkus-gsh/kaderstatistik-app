import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/BackButton";
import { todayInGermany } from "../teams";

type GameRow = {
  id: string;
  event_date: string;
  opponent: string | null;
  event_time: string | null;
  location: string | null;
  season: string;
};

export default async function LiveResultsPage() {
  const supabase = await createClient();

  const [{ data: gamesData }, { data: finishedData }] = await Promise.all([
    supabase
      .from("events")
      .select("id, event_date, opponent, event_time, location, season")
      .eq("type", "game")
      .is("deleted_at", null)
      .gte("event_date", todayInGermany())
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true }),
    supabase.from("match_results").select("event_id").not("finished_at", "is", null),
  ]);

  // Bereits beendete (archivierte) Spiele stehen unter "Letzte Ergebnisse".
  const finishedIds = new Set((finishedData ?? []).map((r) => r.event_id as string));
  const games = ((gamesData as GameRow[] | null) ?? []).filter((g) => !finishedIds.has(g.id));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <h1 className="mb-6 text-xl font-semibold">Live-Ergebnis</h1>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2 pr-8">Datum</th>
            <th className="py-2">Gegner</th>
            <th className="py-2">Uhrzeit</th>
            <th className="py-2">Ort</th>
            <th className="py-2">Saison</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2 pr-8">
                <Link href={`/events/${game.id}`} className="hover:underline">
                  {game.event_date}
                </Link>
              </td>
              <td className="py-2 text-zinc-500">{game.opponent ?? "–"}</td>
              <td className="py-2 text-zinc-500">
                {game.event_time ? game.event_time.slice(0, 5) : "–"}
              </td>
              <td className="py-2 text-zinc-500">{game.location ?? "–"}</td>
              <td className="py-2 text-zinc-500">{game.season}</td>
              <td className="py-2 pl-3 text-right">
                <Link
                  href={`/results/live/${game.id}`}
                  className="inline-block whitespace-nowrap rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Live-Ergebnis
                </Link>
              </td>
            </tr>
          ))}
          {!games.length && (
            <tr>
              <td colSpan={6} className="py-4 text-zinc-500">
                Keine anstehenden Spiele.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
