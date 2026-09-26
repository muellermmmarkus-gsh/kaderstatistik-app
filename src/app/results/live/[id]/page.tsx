import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { getShirtNumbers } from "@/lib/shirtNumbers";
import BackButton from "@/components/BackButton";
import { ownSideOf, teamsForEvent, type GoalEntry } from "../../teams";
import LiveResultBoard, { type PlayerOption } from "./LiveResultBoard";

export default async function LiveResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: event }, { data: result }, { data: players }, canWrite] = await Promise.all([
    supabase
      .from("events")
      .select("id, type, event_date, opponent, event_time, location")
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("match_results")
      .select(
        "id, team_a, team_b, finished_at, match_goal_entries(id, minute, team, kind, shirt_number, player_id, note, created_at)",
      )
      .eq("event_id", id)
      .maybeSingle(),
    supabase.from("players").select("id, first_name, last_name"),
    isTrainer(),
  ]);

  if (!event || event.type !== "game") notFound();

  const [teamA, teamB] = result
    ? [result.team_a as string, result.team_b as string]
    : teamsForEvent(event.opponent);

  const entries: GoalEntry[] = [...(result?.match_goal_entries ?? [])]
    .sort((x, y) => String(x.created_at).localeCompare(String(y.created_at)))
    .map((e) => ({
      id: e.id,
      minute: e.minute ?? "",
      team: e.team,
      kind: e.kind,
      shirtNumber: e.shirt_number,
      playerId: e.player_id,
      note: e.note ?? "",
    }));

  // Auswahl fuer die eigene Mannschaft: Spieler mit Rueckennummer aus dem
  // Spieltermin (bzw. Voreinstellung aus dem letzten Spiel).
  const { numbers } = await getShirtNumbers(supabase, id, event.event_date);
  const nameById = new Map(
    (players ?? []).map((p) => [p.id as string, `${p.first_name} ${p.last_name}`]),
  );
  const playerOptions: PlayerOption[] = [...numbers]
    .filter(([playerId]) => nameById.has(playerId))
    .map(([playerId, shirtNumber]) => ({
      playerId,
      shirtNumber,
      name: nameById.get(playerId)!,
    }))
    .sort((x, y) => x.shirtNumber - y.shirtNumber);

  // Bereits eingetragene Torschuetzen, die (inzwischen) keine Nummer mehr
  // haben, trotzdem auswaehlbar lassen.
  for (const entry of entries) {
    if (entry.playerId && !playerOptions.some((o) => o.playerId === entry.playerId)) {
      playerOptions.push({
        playerId: entry.playerId,
        shirtNumber: entry.shirtNumber,
        name: nameById.get(entry.playerId) ?? "Unbekannter Spieler",
      });
    }
  }

  const isFinished = !!result?.finished_at;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <BackButton href={isFinished ? "/results/recent" : "/results/live"} />
      <LiveResultBoard
        eventId={id}
        teamA={teamA}
        teamB={teamB}
        ownSide={ownSideOf(teamA)}
        playerOptions={playerOptions}
        subtitle={[
          event.event_date,
          event.event_time ? `${event.event_time.slice(0, 5)} Uhr` : null,
          event.location,
        ]
          .filter(Boolean)
          .join(" · ")}
        initialEntries={entries}
        isFinished={isFinished}
        canWrite={canWrite}
      />
    </div>
  );
}
