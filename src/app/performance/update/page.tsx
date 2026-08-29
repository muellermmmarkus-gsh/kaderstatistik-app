import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { savePerformanceUpdate } from "./actions";
import SaveNotice from "@/components/SaveNotice";

const GRADES = [1, 2, 3, 4, 5, 6];

export default async function PerformanceUpdatePage({
  searchParams,
}: {
  searchParams: Promise<{ updateId?: string }>;
}) {
  const { updateId } = await searchParams;
  const supabase = await createClient();

  const [{ data: players }, { data: focuses }, canWrite] = await Promise.all([
    supabase
      .from("players")
      .select("id, first_name, last_name")
      .eq("active", true)
      .order("last_name"),
    supabase.from("exercise_focuses").select("label").order("sort_order"),
    isTrainer(),
  ]);

  const focusLabels = (focuses ?? []).map((f) => f.label);
  const playerIds = (players ?? []).map((p) => p.id);
  const today = new Date().toISOString().slice(0, 10);

  let updateDate = today;
  let reason = "";
  let gradeMap = new Map<string, number>();
  let updateNotFound = false;

  if (updateId) {
    const [{ data: existingUpdate }, { data: existingRatings }] = await Promise.all([
      supabase
        .from("performance_updates")
        .select("id, update_date, reason")
        .eq("id", updateId)
        .maybeSingle(),
      supabase
        .from("performance_ratings")
        .select("player_id, focus, grade")
        .eq("update_id", updateId),
    ]);
    if (existingUpdate) {
      updateDate = existingUpdate.update_date;
      reason = existingUpdate.reason ?? "";
      gradeMap = new Map(
        (existingRatings ?? []).map((r) => [`${r.player_id}__${r.focus}`, r.grade]),
      );
    } else {
      updateNotFound = true;
    }
  } else {
    const { data: currentGrades } = await supabase
      .from("performance_latest")
      .select("player_id, focus, grade");
    gradeMap = new Map(
      (currentGrades ?? []).map((g) => [`${g.player_id}__${g.focus}`, g.grade]),
    );
  }

  const action = savePerformanceUpdate.bind(null, updateId ?? null, playerIds, focusLabels);
  const backHref = updateId ? "/performance/development" : "/";

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="mb-2 text-xl font-semibold">
        {updateId ? "Update anpassen" : "Update"}
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        {updateId
          ? "Passe Datum, Grund und Noten dieses Updates an."
          : "Vergib für jeden Spieler und Übungsschwerpunkt eine Note von 1 bis 6. Beim Speichern werden die Werte unter „Entwicklung“ hinterlegt."}
      </p>

      {!canWrite ? (
        <p className="text-sm text-zinc-500">
          Du hast Nur-Lese-Zugriff. Updates können nur Trainer vornehmen.
        </p>
      ) : updateNotFound ? (
        <p className="text-sm text-zinc-500">
          Dieses Update wurde nicht gefunden – es wurde eventuell bereits gelöscht.{" "}
          <Link href="/performance/development" className="underline">
            Zurück zur Entwicklung
          </Link>
        </p>
      ) : !focusLabels.length ? (
        <p className="text-sm text-zinc-500">
          Es sind noch keine Übungsschwerpunkte unter „Übungsplanung“ angelegt.
        </p>
      ) : !players?.length ? (
        <p className="text-sm text-zinc-500">Noch keine aktiven Spieler angelegt.</p>
      ) : (
        <form action={action} className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="updateDate">
                Update-Datum
              </label>
              <input
                id="updateDate"
                name="updateDate"
                type="date"
                defaultValue={updateDate}
                required
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div className="min-w-[240px] flex-1">
              <label className="mb-1 block text-sm font-medium" htmlFor="reason">
                Grund des Updates
              </label>
              <input
                id="reason"
                name="reason"
                type="text"
                defaultValue={reason}
                placeholder="z. B. Rückrunden-Zwischenstand"
                className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-2">Spieler</th>
                  {focusLabels.map((focus) => (
                    <th key={focus} className="px-2 py-2">
                      {focus}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr
                    key={player.id}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="whitespace-nowrap py-2 pr-2">
                      {player.first_name} {player.last_name}
                    </td>
                    {focusLabels.map((focus) => {
                      const current = gradeMap.get(`${player.id}__${focus}`);
                      return (
                        <td key={focus} className="px-2 py-2">
                          <select
                            name={`grade_${player.id}_${focus}`}
                            defaultValue={current ? String(current) : ""}
                            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            <option value="">–</option>
                            {GRADES.map((grade) => (
                              <option key={grade} value={grade}>
                                {grade}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Speichern
            </button>
            <button
              type="reset"
              className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Abbrechen
            </button>
            <Link
              href={backHref}
              className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Zurück
            </Link>
            <SaveNotice />
          </div>
        </form>
      )}
    </div>
  );
}
