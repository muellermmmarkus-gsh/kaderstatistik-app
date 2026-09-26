import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { saveAttendance, saveAttendanceAndReturn } from "./actions";
import BackButton from "@/components/BackButton";
import SaveNotice from "@/components/SaveNotice";
import SavedQueryNotice from "@/components/SavedQueryNotice";
import EventDetailActions from "./EventDetailActions";
import ShirtNumberGuard from "./ShirtNumberGuard";
import { getShirtNumbers, SHIRT_NUMBER_MAX } from "@/lib/shirtNumbers";
import { ownSideOf } from "@/app/results/teams";

const SHIRT_NUMBERS = Array.from({ length: SHIRT_NUMBER_MAX }, (_, i) => i + 1);

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, type, event_date, opponent, event_time, location, label, season")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!event) notFound();

  const [
    { data: players },
    { data: attendance },
    { data: goals },
    { data: trainers },
    { data: trainerAttendance },
    canWrite,
  ] = await Promise.all([
    supabase
      .from("players")
      .select("id, first_name, last_name")
      .eq("active", true)
      .order("last_name"),
    supabase
      .from("attendance")
      .select(
        "player_id, present, excused, registered, performance, motivation, discipline, player_notes",
      )
      .eq("event_id", id),
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
    isTrainer(),
  ]);

  const isGame = event.type === "game";

  // Bei Spielen: Rueckennummern (ggf. Voreinstellung aus dem letzten Spiel)
  // und Tore ausschliesslich aus den Live-Ergebnis-Eintraegen.
  const shirtNumbers = isGame
    ? await getShirtNumbers(supabase, id, event.event_date)
    : { numbers: new Map<string, number>(), isPreset: false };
  const liveGoalsByPlayer = new Map<string, number>();
  if (isGame) {
    const { data: result } = await supabase
      .from("match_results")
      .select("team_a, match_goal_entries(team, kind, player_id)")
      .eq("event_id", id)
      .maybeSingle();
    if (result) {
      const ownSide = ownSideOf(result.team_a as string);
      for (const e of result.match_goal_entries ?? []) {
        if (e.team === ownSide && e.kind === "goal" && e.player_id) {
          liveGoalsByPlayer.set(e.player_id, (liveGoalsByPlayer.get(e.player_id) ?? 0) + 1);
        }
      }
    }
  }

  const presentByPlayer = new Map(
    attendance?.map((a) => [a.player_id, a.present]),
  );
  const excusedByPlayer = new Map(
    attendance?.map((a) => [a.player_id, a.excused]),
  );
  const registeredByPlayer = new Map(
    attendance?.map((a) => [a.player_id, a.registered]),
  );
  const performanceByPlayer = new Map(
    attendance?.map((a) => [a.player_id, a.performance]),
  );
  const motivationByPlayer = new Map(
    attendance?.map((a) => [a.player_id, a.motivation]),
  );
  const disciplineByPlayer = new Map(
    attendance?.map((a) => [a.player_id, a.discipline]),
  );
  const notesByPlayer = new Map(
    attendance?.map((a) => [a.player_id, a.player_notes]),
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
  const saveAndBack = saveAttendanceAndReturn.bind(null, id, playerIds, trainerIds);

  const hasGoals = event.type === "game" || event.type === "tournament";

  const playerColSpan =
    2 +
    (isGame ? 2 : 0) +
    (event.type === "training" ? 1 : 0) +
    (hasGoals ? 1 : 0) +
    (event.type === "training" ? 4 : 0);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <BackButton href="/events" />
      <SavedQueryNotice />
      <h1 className="mb-1 text-xl font-semibold">
        {event.type === "training"
          ? "Training"
          : event.type === "game"
            ? "Spiel"
            : event.type === "tournament"
              ? "Turnier"
              : "Event"}{" "}
        – {event.event_date}
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Saison {event.season}
        {event.opponent ? ` · gegen ${event.opponent}` : ""}
        {event.event_time ? ` · ${event.event_time.slice(0, 5)} Uhr` : ""}
        {event.location ? ` · ${event.location}` : ""}
        {event.label ? ` · ${event.label}` : ""}
      </p>

      {event.type === "training" && (
        <Link
          href={`/trainings/${event.id}`}
          className="mb-6 inline-block rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Zum Trainingsplan
        </Link>
      )}

      {event.type === "game" && (
        <Link
          href={`/events/${event.id}/lineup`}
          className="mb-6 inline-block rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Aufstellung
        </Link>
      )}

      {!canWrite && (
        <p className="mb-6 text-sm text-zinc-500">
          Du hast Nur-Lese-Zugriff. Änderungen können nur Trainer vornehmen.
        </p>
      )}

      <form action={save}>
        {isGame && canWrite && <ShirtNumberGuard />}
        <section className="mb-8">
          <h2 className="mb-3 font-medium">Spieler</h2>
          {isGame && (
            <p className="mb-3 text-sm text-zinc-500">
              Tore werden über{" "}
              <Link href={`/results/live/${event.id}`} className="underline">
                Live-Ergebnis
              </Link>{" "}
              erfasst.
              {canWrite && shirtNumbers.isPreset &&
                " Die Rückennummern sind aus dem letzten Spiel übernommen – mit Speichern werden sie für dieses Spiel festgelegt."}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2">Spieler</th>
                  {isGame && <th className="py-2">Rückennr.</th>}
                  {isGame && <th className="py-2">Angemeldet</th>}
                  <th className="py-2">Anwesend</th>
                  {event.type === "training" && <th className="py-2">Entschuldigt</th>}
                  {hasGoals && <th className="py-2">Tore</th>}
                  {event.type === "training" && (
                    <>
                      <th className="py-2">Leistung</th>
                      <th className="py-2">Motivation</th>
                      <th className="py-2">Disziplin</th>
                      <th className="py-2">Notizen</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {players?.map((player) => (
                  <tr
                    key={player.id}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-2 whitespace-nowrap">
                      {player.first_name} {player.last_name}
                    </td>
                    {isGame && (
                      <td className="py-2">
                        <select
                          name={`shirt_${player.id}`}
                          aria-label={`Rückennummer ${player.first_name} ${player.last_name}`}
                          defaultValue={shirtNumbers.numbers.get(player.id) ?? ""}
                          disabled={!canWrite}
                          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                        >
                          <option value="">–</option>
                          {SHIRT_NUMBERS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    {isGame && (
                      <td className="py-2">
                        <input
                          type="checkbox"
                          name={`registered_player_${player.id}`}
                          defaultChecked={registeredByPlayer.get(player.id) ?? false}
                          disabled={!canWrite}
                          className="h-4 w-4"
                        />
                      </td>
                    )}
                    <td className="py-2">
                      <input
                        type="checkbox"
                        name={`present_player_${player.id}`}
                        defaultChecked={presentByPlayer.get(player.id) ?? false}
                        disabled={!canWrite}
                        className="h-4 w-4"
                      />
                    </td>
                    {event.type === "training" && (
                      <td className="py-2">
                        <input
                          type="checkbox"
                          name={`excused_player_${player.id}`}
                          defaultChecked={excusedByPlayer.get(player.id) ?? false}
                          disabled={!canWrite}
                          className="h-4 w-4"
                        />
                      </td>
                    )}
                    {isGame && (
                      <td className="py-2 pl-2 tabular-nums">
                        {liveGoalsByPlayer.get(player.id) ?? 0}
                      </td>
                    )}
                    {hasGoals && !isGame && (
                      <td className="py-2">
                        <input
                          type="number"
                          min={0}
                          name={`goals_${player.id}`}
                          defaultValue={goalsByPlayer.get(player.id) ?? 0}
                          disabled={!canWrite}
                          className="w-16 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                        />
                      </td>
                    )}
                    {event.type === "training" && (
                      <>
                        <td className="py-2">
                          <select
                            name={`performance_${player.id}`}
                            defaultValue={performanceByPlayer.get(player.id) ?? ""}
                            disabled={!canWrite}
                            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            <option value="">–</option>
                            <option value="stark">stark</option>
                            <option value="mittel">mittel</option>
                            <option value="schwach">schwach</option>
                          </select>
                        </td>
                        <td className="py-2">
                          <select
                            name={`motivation_${player.id}`}
                            defaultValue={motivationByPlayer.get(player.id) ?? ""}
                            disabled={!canWrite}
                            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            <option value="">–</option>
                            <option value="hoch">hoch</option>
                            <option value="mittel">mittel</option>
                            <option value="niedrig">niedrig</option>
                          </select>
                        </td>
                        <td className="py-2">
                          <select
                            name={`discipline_${player.id}`}
                            defaultValue={disciplineByPlayer.get(player.id) ?? ""}
                            disabled={!canWrite}
                            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            <option value="">–</option>
                            <option value="sehr gut">sehr gut</option>
                            <option value="mittel">mittel</option>
                            <option value="gering">gering</option>
                          </select>
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            name={`notes_${player.id}`}
                            maxLength={50}
                            defaultValue={notesByPlayer.get(player.id) ?? ""}
                            disabled={!canWrite}
                            className="w-40 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                          />
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {!players?.length && (
                  <tr>
                    <td colSpan={playerColSpan} className="py-4 text-zinc-500">
                      Keine aktiven Spieler vorhanden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
                      disabled={!canWrite}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="checkbox"
                      name={`present_trainer_${trainer.id}`}
                      defaultChecked={presentByTrainer.get(trainer.id) ?? false}
                      disabled={!canWrite}
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

        <EventDetailActions
          canWrite={canWrite}
          hasContent={!!players?.length || !!trainers?.length}
          saveAndBack={saveAndBack}
          backHref="/events"
        />
        <SaveNotice />
      </form>
    </div>
  );
}
