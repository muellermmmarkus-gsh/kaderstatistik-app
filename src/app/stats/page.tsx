import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/BackButton";

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

type TrainerAttendanceRow = {
  trainer_id: string;
  first_name: string;
  last_name: string;
  type: "training" | "game";
  attended: number;
  total: number;
  attendance_pct: number;
};

type TrainerMonthRow = TrainerAttendanceRow & { month: string };

type GoalsRow = {
  player_id: string;
  first_name: string;
  last_name: string;
  goals: number;
};

type AssessmentAttendanceRow = {
  player_id: string;
  performance: string | null;
  motivation: string | null;
  discipline: string | null;
};

const PERFORMANCE_ORDER = ["stark", "mittel", "schwach"];
const MOTIVATION_ORDER = ["hoch", "mittel", "niedrig"];
const DISCIPLINE_ORDER = ["sehr gut", "mittel", "gering"];

function countByPlayer(rows: AssessmentAttendanceRow[], field: "performance" | "motivation" | "discipline") {
  const byPlayer = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const value = row[field];
    if (!value) continue;
    const counts = byPlayer.get(row.player_id) ?? {};
    counts[value] = (counts[value] ?? 0) + 1;
    byPlayer.set(row.player_id, counts);
  }
  return byPlayer;
}

function formatCounts(counts: Record<string, number> | undefined, order: string[]) {
  return order.map((key) => counts?.[key] ?? 0).join("/");
}

type PivotRow = {
  first_name: string;
  last_name: string;
  type: "training" | "game";
  attended: number;
  total: number;
  attendance_pct: number;
};

type View = "season" | "month";

function pivotById<T extends PivotRow>(rows: T[], idOf: (row: T) => string) {
  const byId = new Map<string, { id: string; name: string; training?: T; game?: T }>();

  for (const row of rows) {
    const id = idOf(row);
    const entry = byId.get(id) ?? { id, name: `${row.first_name} ${row.last_name}` };
    entry[row.type] = row;
    byId.set(id, entry);
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function formatPct(row: PivotRow | undefined) {
  if (!row) return "–";
  return `${row.attended}/${row.total} (${row.attendance_pct}%)`;
}

function formatMonthLabel(month: string) {
  return new Date(month).toLocaleDateString("de-DE", {
    month: "short",
    year: "2-digit",
  });
}

function toMonthMatrix(
  monthPivot: { month: string; rows: { name: string; training?: PivotRow; game?: PivotRow } [] }[],
  months: string[],
  type: "training" | "game",
) {
  const names = new Set<string>();
  for (const { rows } of monthPivot) {
    for (const row of rows) names.add(row.name);
  }

  return [...names].sort((a, b) => a.localeCompare(b)).map((name) => ({
    name,
    cells: monthPivot.map(
      ({ rows }) => rows.find((r) => r.name === name)?.[type],
    ),
  }));
}

function AttendanceTable({
  caption,
  rows,
  performanceByPlayer,
  motivationByPlayer,
  disciplineByPlayer,
}: {
  caption: string;
  rows: { id: string; name: string; training?: PivotRow; game?: PivotRow }[];
  performanceByPlayer?: Map<string, Record<string, number>>;
  motivationByPlayer?: Map<string, Record<string, number>>;
  disciplineByPlayer?: Map<string, Record<string, number>>;
}) {
  const showAssessment = !!performanceByPlayer;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2">Name</th>
            <th className="py-2">Training</th>
            <th className="py-2">Spiel</th>
            {showAssessment && (
              <>
                <th className="whitespace-nowrap py-2">Leistung (stark/mittel/schwach)</th>
                <th className="whitespace-nowrap py-2">Motivation (hoch/mittel/niedrig)</th>
                <th className="whitespace-nowrap py-2">Disziplin (sehr gut/mittel/gering)</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <tr
              key={entry.name}
              className="border-b border-zinc-100 dark:border-zinc-900"
            >
              <td className="py-2 whitespace-nowrap">{entry.name}</td>
              <td className="py-2">{formatPct(entry.training)}</td>
              <td className="py-2">{formatPct(entry.game)}</td>
              {showAssessment && (
                <>
                  <td className="py-2">
                    {formatCounts(performanceByPlayer?.get(entry.id), PERFORMANCE_ORDER)}
                  </td>
                  <td className="py-2">
                    {formatCounts(motivationByPlayer?.get(entry.id), MOTIVATION_ORDER)}
                  </td>
                  <td className="py-2">
                    {formatCounts(disciplineByPlayer?.get(entry.id), DISCIPLINE_ORDER)}
                  </td>
                </>
              )}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={showAssessment ? 6 : 3} className="py-4 text-zinc-500">
                Keine Daten fuer diese Saison.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function MonthMatrixTable({
  caption,
  months,
  rows,
}: {
  caption: string;
  months: string[];
  rows: { name: string; cells: (PivotRow | undefined)[] }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2 pr-4">Name</th>
            {months.map((month) => (
              <th key={month} className="whitespace-nowrap py-2 px-2">
                {formatMonthLabel(month)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.name}
              className="border-b border-zinc-100 dark:border-zinc-900"
            >
              <td className="py-2 pr-4 whitespace-nowrap">{row.name}</td>
              {row.cells.map((cell, i) => (
                <td key={months[i]} className="whitespace-nowrap py-2 px-2">
                  {formatPct(cell)}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td
                colSpan={months.length + 1}
                className="py-4 text-zinc-500"
              >
                Keine Daten fuer diese Saison.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; view?: string }>;
}) {
  const { season: selectedSeason, view: rawView } = await searchParams;
  const view: View = rawView === "month" ? "month" : "season";
  const supabase = await createClient();

  const { data: seasonRows } = await supabase
    .from("events")
    .select("season")
    .order("season", { ascending: false });

  const seasons = [...new Set(seasonRows?.map((r) => r.season) ?? [])];
  const season = selectedSeason ?? seasons[0];

  const [
    { data: bySeason },
    { data: trainerBySeason },
    { data: byMonth },
    { data: trainerByMonth },
    { data: byGoals },
    { data: assessmentRows },
  ] = await Promise.all([
    season && view === "season"
      ? supabase
          .from("attendance_by_season")
          .select(
            "player_id, first_name, last_name, type, attended, total, attendance_pct",
          )
          .eq("season", season)
      : Promise.resolve({ data: [] as AttendanceRow[] }),
    season && view === "season"
      ? supabase
          .from("trainer_attendance_by_season")
          .select(
            "trainer_id, first_name, last_name, type, attended, total, attendance_pct",
          )
          .eq("season", season)
      : Promise.resolve({ data: [] as TrainerAttendanceRow[] }),
    season && view === "month"
      ? supabase
          .from("attendance_by_month")
          .select(
            "player_id, first_name, last_name, type, month, attended, total, attendance_pct",
          )
          .eq("season", season)
          .order("month")
      : Promise.resolve({ data: [] as MonthRow[] }),
    season && view === "month"
      ? supabase
          .from("trainer_attendance_by_month")
          .select(
            "trainer_id, first_name, last_name, type, month, attended, total, attendance_pct",
          )
          .eq("season", season)
          .order("month")
      : Promise.resolve({ data: [] as TrainerMonthRow[] }),
    season
      ? supabase
          .from("goals_by_season")
          .select("player_id, first_name, last_name, goals")
          .eq("season", season)
          .order("goals", { ascending: false })
      : Promise.resolve({ data: [] as GoalsRow[] }),
    season && view === "season"
      ? supabase
          .from("attendance")
          .select("player_id, performance, motivation, discipline, events!inner(season, type)")
          .eq("events.season", season)
          .eq("events.type", "training")
      : Promise.resolve({ data: [] as AssessmentAttendanceRow[] }),
  ]);

  const assessmentData = (assessmentRows as AssessmentAttendanceRow[] | null) ?? [];
  const performanceByPlayer = countByPlayer(assessmentData, "performance");
  const motivationByPlayer = countByPlayer(assessmentData, "motivation");
  const disciplineByPlayer = countByPlayer(assessmentData, "discipline");

  const seasonPivot = pivotById(
    (bySeason as AttendanceRow[]) ?? [],
    (r) => r.player_id,
  );
  const trainerSeasonPivot = pivotById(
    (trainerBySeason as TrainerAttendanceRow[]) ?? [],
    (r) => r.trainer_id,
  );

  const months = [...new Set((byMonth as MonthRow[])?.map((r) => r.month))];
  const monthPivot = months.map((month) => ({
    month,
    rows: pivotById(
      ((byMonth as MonthRow[]) ?? []).filter((r) => r.month === month),
      (r) => r.player_id,
    ),
  }));

  const trainerMonths = [
    ...new Set((trainerByMonth as TrainerMonthRow[])?.map((r) => r.month)),
  ];
  const trainerMonthPivot = trainerMonths.map((month) => ({
    month,
    rows: pivotById(
      ((trainerByMonth as TrainerMonthRow[]) ?? []).filter(
        (r) => r.month === month,
      ),
      (r) => r.trainer_id,
    ),
  }));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
                <input type="hidden" name="view" value={view} />
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

        {!!seasons.length && (
          <form method="get" className="mt-3 flex items-center gap-2">
            <label htmlFor="view" className="text-sm">
              Ansicht
            </label>
            <select
              id="view"
              name="view"
              defaultValue={view}
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="season">Gesamte Saison</option>
              <option value="month">Monatlich</option>
            </select>
            {season && <input type="hidden" name="season" value={season} />}
            <button type="submit" className="text-sm underline">
              anzeigen
            </button>
          </form>
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
          {view === "season" && (
            <>
              <section className="mb-10">
                <h2 className="mb-3 font-medium">
                  Spieler – Anwesenheit Saison {season}
                </h2>
                <AttendanceTable
                  caption="Spieler-Anwesenheit gesamte Saison"
                  rows={seasonPivot}
                  performanceByPlayer={performanceByPlayer}
                  motivationByPlayer={motivationByPlayer}
                  disciplineByPlayer={disciplineByPlayer}
                />
              </section>

              <section className="mb-10">
                <h2 className="mb-3 font-medium">
                  Trainer – Anwesenheit Saison {season}
                </h2>
                <AttendanceTable
                  caption="Trainer-Anwesenheit gesamte Saison"
                  rows={trainerSeasonPivot}
                />
              </section>
            </>
          )}

          {view === "month" && (
            <>
              <section className="mb-10">
                <h2 className="mb-3 font-medium">
                  Spieler – Anwesenheit pro Monat
                </h2>
                <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Training
                </h3>
                <MonthMatrixTable
                  caption="Spieler-Anwesenheit Training pro Monat"
                  months={months}
                  rows={toMonthMatrix(monthPivot, months, "training")}
                />
                <h3 className="mb-2 mt-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Spiel
                </h3>
                <MonthMatrixTable
                  caption="Spieler-Anwesenheit Spiel pro Monat"
                  months={months}
                  rows={toMonthMatrix(monthPivot, months, "game")}
                />
              </section>

              <section className="mb-10">
                <h2 className="mb-3 font-medium">
                  Trainer – Anwesenheit pro Monat
                </h2>
                <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Training
                </h3>
                <MonthMatrixTable
                  caption="Trainer-Anwesenheit Training pro Monat"
                  months={trainerMonths}
                  rows={toMonthMatrix(trainerMonthPivot, trainerMonths, "training")}
                />
                <h3 className="mb-2 mt-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Spiel
                </h3>
                <MonthMatrixTable
                  caption="Trainer-Anwesenheit Spiel pro Monat"
                  months={trainerMonths}
                  rows={toMonthMatrix(trainerMonthPivot, trainerMonths, "game")}
                />
              </section>
            </>
          )}

          <section>
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
        </>
      )}
    </div>
  );
}
