import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type AttendanceRow = {
  player_id: string;
  first_name: string;
  last_name: string;
  type: "training" | "game";
  attended: number;
  total: number;
  attendance_pct: number;
};

type MonthRow = AttendanceRow & { month: string };

type GoalsRow = {
  player_id: string;
  first_name: string;
  last_name: string;
  goals: number;
};

function pivotByPlayer(rows: AttendanceRow[]) {
  const byPlayer = new Map<
    string,
    { name: string; training?: AttendanceRow; game?: AttendanceRow }
  >();

  for (const row of rows) {
    const entry = byPlayer.get(row.player_id) ?? {
      name: `${row.first_name} ${row.last_name}`,
    };
    entry[row.type] = row;
    byPlayer.set(row.player_id, entry);
  }

  return [...byPlayer.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function formatPct(row: AttendanceRow | undefined) {
  if (!row) return "–";
  return `${row.attended}/${row.total} (${row.attendance_pct}%)`;
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: selectedSeason } = await searchParams;
  const supabase = await createClient();

  const { data: seasonRows } = await supabase
    .from("events")
    .select("season")
    .order("season", { ascending: false });

  const seasons = [...new Set(seasonRows?.map((r) => r.season) ?? [])];
  const season = selectedSeason ?? seasons[0];

  const [{ data: bySeason }, { data: byMonth }, { data: byGoals }] =
    await Promise.all([
      season
        ? supabase
            .from("attendance_by_season")
            .select(
              "player_id, first_name, last_name, type, attended, total, attendance_pct",
            )
            .eq("season", season)
        : Promise.resolve({ data: [] as AttendanceRow[] }),
      season
        ? supabase
            .from("attendance_by_month")
            .select(
              "player_id, first_name, last_name, type, month, attended, total, attendance_pct",
            )
            .eq("season", season)
            .order("month")
        : Promise.resolve({ data: [] as MonthRow[] }),
      season
        ? supabase
            .from("goals_by_season")
            .select("player_id, first_name, last_name, goals")
            .eq("season", season)
            .order("goals", { ascending: false })
        : Promise.resolve({ data: [] as GoalsRow[] }),
    ]);

  const seasonPivot = pivotByPlayer((bySeason as AttendanceRow[]) ?? []);

  const months = [...new Set((byMonth as MonthRow[])?.map((r) => r.month))];
  const monthPivot = months.map((month) => ({
    month,
    rows: pivotByPlayer(
      ((byMonth as MonthRow[]) ?? []).filter((r) => r.month === month),
    ),
  }));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Statistik</h1>
        {!!seasons.length && (
          <div className="flex items-center gap-3">
            <form method="get" className="flex items-center gap-2">
              <label htmlFor="season" className="text-sm">
                Saison
              </label>
              <select
                id="season"
                name="season"
                defaultValue={season}
                className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {seasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button type="submit" className="text-sm underline">
                anzeigen
              </button>
            </form>
            {season && (
              <a
                href={`/stats/export?season=${encodeURIComponent(season)}`}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
              >
                CSV-Export
              </a>
            )}
          </div>
        )}
      </div>

      {!seasons.length && (
        <p className="text-zinc-500">
          Noch keine Daten vorhanden. Erst{" "}
          <Link href="/events" className="underline">
            Termine
          </Link>{" "}
          anlegen und Anwesenheit erfassen.
        </p>
      )}

      {season && (
        <>
          <section className="mb-10">
            <h2 className="mb-3 font-medium">Anwesenheit Saison {season}</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2">Spieler</th>
                  <th className="py-2">Training</th>
                  <th className="py-2">Spiel</th>
                </tr>
              </thead>
              <tbody>
                {seasonPivot.map((entry) => (
                  <tr
                    key={entry.name}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-2">{entry.name}</td>
                    <td className="py-2">{formatPct(entry.training)}</td>
                    <td className="py-2">{formatPct(entry.game)}</td>
                  </tr>
                ))}
                {!seasonPivot.length && (
                  <tr>
                    <td colSpan={3} className="py-4 text-zinc-500">
                      Keine Daten fuer diese Saison.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="mb-10">
            <h2 className="mb-3 font-medium">Torschützen Saison {season}</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2">Spieler</th>
                  <th className="py-2">Tore</th>
                </tr>
              </thead>
              <tbody>
                {(byGoals as GoalsRow[])?.map((row) => (
                  <tr
                    key={row.player_id}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-2">
                      {row.first_name} {row.last_name}
                    </td>
                    <td className="py-2">{row.goals}</td>
                  </tr>
                ))}
                {!byGoals?.length && (
                  <tr>
                    <td colSpan={2} className="py-4 text-zinc-500">
                      Noch keine Tore erfasst.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="mb-3 font-medium">Anwesenheit pro Monat</h2>
            {monthPivot.map(({ month, rows }) => (
              <div key={month} className="mb-6">
                <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  {new Date(month).toLocaleDateString("de-DE", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="py-2">Spieler</th>
                      <th className="py-2">Training</th>
                      <th className="py-2">Spiel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((entry) => (
                      <tr
                        key={entry.name}
                        className="border-b border-zinc-100 dark:border-zinc-900"
                      >
                        <td className="py-2">{entry.name}</td>
                        <td className="py-2">{formatPct(entry.training)}</td>
                        <td className="py-2">{formatPct(entry.game)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {!monthPivot.length && (
              <p className="text-zinc-500">Keine Daten fuer diese Saison.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
