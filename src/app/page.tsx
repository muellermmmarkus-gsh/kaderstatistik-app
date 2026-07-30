import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type EventKind = "training" | "game";

export default async function Home() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: playerCount },
    { count: trainerCount },
    { data: completedEvents },
    { data: overallAttendance },
  ] = await Promise.all([
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("trainers")
      .select("*", { count: "exact", head: true })
      .eq("active", true),
    supabase.from("events").select("season, type").lte("event_date", today),
    supabase
      .from("attendance_overall_by_season")
      .select("season, attendance_pct"),
  ]);

  const unitsBySeason = new Map<string, { training: number; game: number }>();
  for (const event of completedEvents ?? []) {
    const entry = unitsBySeason.get(event.season) ?? { training: 0, game: 0 };
    entry[event.type as EventKind] += 1;
    unitsBySeason.set(event.season, entry);
  }

  const attendancePctBySeason = new Map(
    (overallAttendance ?? []).map((r) => [r.season, r.attendance_pct as number]),
  );

  const seasons = [...unitsBySeason.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">Spieler im Kader</p>
          <p className="text-3xl font-semibold">{playerCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">Trainer im Kader</p>
          <p className="text-3xl font-semibold">{trainerCount ?? 0}</p>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 font-medium">Saison-Übersicht</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2">Saison</th>
              <th className="py-2">Trainings absolviert</th>
              <th className="py-2">Spiele absolviert</th>
              <th className="py-2">Ø Anwesenheit Team</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((season) => {
              const units = unitsBySeason.get(season)!;
              const pct = attendancePctBySeason.get(season);
              return (
                <tr
                  key={season}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                >
                  <td className="py-2">{season}</td>
                  <td className="py-2">{units.training}</td>
                  <td className="py-2">{units.game}</td>
                  <td className="py-2">{pct != null ? `${pct}%` : "–"}</td>
                </tr>
              );
            })}
            {!seasons.length && (
              <tr>
                <td colSpan={4} className="py-4 text-zinc-500">
                  Noch keine absolvierten Einheiten.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/players"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Spieler
        </Link>
        <Link
          href="/trainers"
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Trainer
        </Link>
        <Link
          href="/events"
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Termine
        </Link>
        <Link
          href="/stats"
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Statistik
        </Link>
      </div>
    </div>
  );
}
