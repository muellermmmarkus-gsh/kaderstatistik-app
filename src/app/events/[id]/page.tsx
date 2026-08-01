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
    .select("id, type, event_date, opponent, label, season")
    .eq("id", id)
    .single();

  if (!event) notFound();

  const [
    { data: players },
    { data: attendance },
    { data: goals },
    { data: trainers },
    { data: trainerAttendance },
  ] = await Promise.all([
    supabase
      .from("players")
      .select("id, first_name, last_name")
      .eq("active", true)
      .order("last_name"),
    supabase.from("attendance").select("player_id, present").eq("event_id", id),
    supabase.from("goals").select("player_id, goal_count").eq("event_id", id),
    supabase
      .from("trainers")
      .select("id, first_name, last_name")
      .eq("active", true)
      .order("last_name"),
    supabase
      .from("trainer_attendance")
      .select("trainer_id, present, confirmed")
      .eq("event_id", id),
  ]);

  const presentByPlayer = new Map(
    attendance?.map((a) => [a.player_id, a.present]),
  );
  const goalsByPlayer = new Map(
    goals?.map((g) => [g.player_id, g.goal_count]),
  );
  const presentByTrainer = new Map(
    trainerAttendance?.map((a) => [a.trainer_id, a.present]),
  );
  const confirmedByTrainer = new Map(
    trainerAttendance?.map((a) => [a.trainer_id, a.confirmed]),
  );

  const playerIds = players?.map((p) => p.id) ?? [];
  const trainerIds = trainers?.map((t) => t.id) ?? [];
  const save = saveAttendance.bind(null, id, playerIds, trainerIds);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold">
        {event.type === "training"
          ? "Training"
          : event.type === "game"
            ? "Spiel"
            : "Event"}{" "}
        – {event.event_date}
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Saison {event.season}
        {event.opponent ? ` · gegen ${event.opponent}` : ""}
        {event.label ? ` · ${event.label}` : ""}
      </p>

      <form action={save}>
        <section className="mb-8">
          <h2 className="mb-3 font-medium">Spieler</h2>
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
                      name={`present_player_${player.id}`}
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
        </section>

        <section className="mb-8">
          <h2 className="mb-3 font-medium">Trainer</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2">Trainer</th>
                <th className="py-2">Zugesagt</th>
                <th className="py-2">Anwesend</th>
              </tr>
            </thead>
            <tbody>
              {trainers?.map((trainer) => (
                <tr
                  key={trainer.id}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                >
                  <td className="py-2">
                    {trainer.first_name} {trainer.last_name}
                  </td>
                  <td className="py-2">
                    <input
                      type="checkbox"
                      name={`confirmed_trainer_${trainer.id}`}
                      defaultChecked={confirmedByTrainer.get(trainer.id) ?? false}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="checkbox"
                      name={`present_trainer_${trainer.id}`}
                      defaultChecked={presentByTrainer.get(trainer.id) ?? false}
                      className="h-4 w-4"
                    />
                  </td>
                </tr>
              ))}
              {!trainers?.length && (
                <tr>
                  <td colSpan={3} className="py-4 text-zinc-500">
                    Keine aktiven Trainer vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {(!!players?.length || !!trainers?.length) && (
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Speichern
          </button>
        )}
      </form>
    </div>
  );
}
