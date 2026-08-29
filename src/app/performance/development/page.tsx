import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { deletePerformanceUpdate } from "./actions";
import DeleteButton from "@/components/DeleteButton";

// ISO-8601-Kalenderwoche (Montag-basiert, Woche 1 enthaelt den ersten
// Donnerstag des Jahres) - Standard in Deutschland.
function getIsoWeek(dateStr: string): { week: number; year: number } {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const target = new Date(date.getTime());
  const dayNumber = (date.getUTCDay() + 6) % 7; // Montag = 0
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return { week, year: target.getUTCFullYear() };
}

export default async function PerformanceDevelopmentPage() {
  const supabase = await createClient();
  const [{ data: players }, { data: focuses }, { data: updates }, { data: ratings }, canWrite] =
    await Promise.all([
      supabase
        .from("players")
        .select("id, first_name, last_name")
        .eq("active", true)
        .order("last_name"),
      supabase.from("exercise_focuses").select("label").order("sort_order"),
      supabase
        .from("performance_updates")
        .select("id, update_date, reason")
        .order("update_date"),
      supabase.from("performance_ratings").select("update_id, player_id, focus, grade"),
      isTrainer(),
    ]);

  const focusLabels = (focuses ?? []).map((f) => f.label);
  const gradeMap = new Map(
    (ratings ?? []).map((r) => [`${r.update_id}__${r.player_id}__${r.focus}`, r.grade]),
  );

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="mb-2 text-xl font-semibold">Entwicklung</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Noten je Spieler und Übungsschwerpunkt im Verlauf der Updates.
      </p>

      {!updates?.length ? (
        <p className="text-sm text-zinc-500">Noch keine Updates vorhanden.</p>
      ) : !players?.length ? (
        <p className="text-sm text-zinc-500">Noch keine aktiven Spieler angelegt.</p>
      ) : !focusLabels.length ? (
        <p className="text-sm text-zinc-500">
          Es sind noch keine Übungsschwerpunkte unter „Übungsplanung“ angelegt.
        </p>
      ) : (
        <div className="space-y-10">
          {players.map((player) => (
            <div key={player.id}>
              <h2 className="mb-2 font-medium">
                {player.first_name} {player.last_name}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    {canWrite && (
                      <tr>
                        <th className="py-1 pr-2" />
                        {updates.map((update) => {
                          const action = deletePerformanceUpdate.bind(null, update.id);
                          const { week, year } = getIsoWeek(update.update_date);
                          return (
                            <th key={update.id} className="px-2 py-1 text-center font-normal">
                              <form action={action}>
                                <DeleteButton
                                  confirmMessage={`Sollen die Noten des Updates KW ${week}/${year} (${update.update_date}) für alle Spieler wirklich unwiderruflich gelöscht werden?`}
                                  className="text-xs text-red-600 hover:underline dark:text-red-400"
                                >
                                  Entfernen
                                </DeleteButton>
                              </form>
                            </th>
                          );
                        })}
                      </tr>
                    )}
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="py-2 pr-2">Schwerpunkt</th>
                      {updates.map((update) => {
                        const { week, year } = getIsoWeek(update.update_date);
                        return (
                          <th
                            key={update.id}
                            className="px-2 py-2 text-center"
                            title={`${update.update_date}${
                              update.reason ? ` – ${update.reason}` : ""
                            }`}
                          >
                            KW {week}/{year}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {focusLabels.map((focus) => (
                      <tr
                        key={focus}
                        className="border-b border-zinc-100 dark:border-zinc-900"
                      >
                        <td className="whitespace-nowrap py-2 pr-2">{focus}</td>
                        {updates.map((update) => {
                          const grade = gradeMap.get(
                            `${update.id}__${player.id}__${focus}`,
                          );
                          return (
                            <td key={update.id} className="px-2 py-2 text-center">
                              {grade ?? "–"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
