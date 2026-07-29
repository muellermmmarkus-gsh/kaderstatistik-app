import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveAttendance } from "./actions";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, type, event_date, opponent, season")
    .eq("id", id)
    .single();

  if (!event) notFound();

  const [{ data: players }, { data: attendance }, { data: goals }] =
    await Promise.all([
      supabase
        .from("players")
        .select("id, first_name, last_name")
        .eq("active", true)
        .order("last_name"),
      supabase
        .from("attendance")
        .select("player_id, present")
        .eq("event_id", id),
      supabase.from("goals").select("player_id, goal_count").eq("event_id", id),
    ]);

  const presentByPlayer = new Map(
    attendance?.map((a) => [a.player_id, a.present]),
  );
  const goalsByPlayer = new Map(
    goals?.map((g) => [g.player_id, g.goal_count]),
  );

  const playerIds = players?.map((p) => p.id) ?? [];
  const save = saveAttendance.bind(null, id, playerIds);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold">
        {event.type === "training" ? "Training" : "Spiel"} –{" "}
        {event.event_date}
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Saison {event.season}
        {event.opponent ? ` · gegen ${event.opponent}` : ""}
      </p>

      <form action={save}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2">Spieler</th>
              <th className="py-2">Anwesend</th>
              {event.type === "game" && <th className="py-2">Tore</th>}
            </tr>
          </thead>
          <tbody>
            {players?.map((player) => (
              <tr
                key={player.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2">
                  {player.first_name} {player.last_name}
                </td>
                <td className="py-2">
                  <input
                    type="checkbox"
                    name={`present_${player.id}`}
                    defaultChecked={presentByPlayer.get(player.id) ?? false}
                    className="h-4 w-4"
                  />
                </td>
                {event.type === "game" && (
                  <td className="py-2">
                    <input
                      type="number"
                      min={0}
                      name={`goals_${player.id}`}
                      defaultValue={goalsByPlayer.get(player.id) ?? 0}
                      className="w-16 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </td>
                )}
              </tr>
            ))}
            {!players?.length && (
              <tr>
                <td colSpan={3} className="py-4 text-zinc-500">
                  Keine aktiven Spieler vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {!!players?.length && (
          <button
            type="submit"
            className="mt-6 rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Speichern
          </button>
        )}
      </form>
    </div>
  );
}
