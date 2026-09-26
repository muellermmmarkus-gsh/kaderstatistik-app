import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import BackButton from "@/components/BackButton";
import { teamsForEvent, type GoalEntry } from "../../teams";
import LiveResultBoard from "./LiveResultBoard";

export default async function LiveResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: event }, { data: result }, canWrite] = await Promise.all([
    supabase
      .from("events")
      .select("id, type, event_date, opponent, event_time, location")
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("match_results")
      .select(
        "id, team_a, team_b, finished_at, match_goal_entries(id, minute, team, kind, shirt_number, note, created_at)",
      )
      .eq("event_id", id)
      .maybeSingle(),
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
      note: e.note ?? "",
    }));

  const isFinished = !!result?.finished_at;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <BackButton href={isFinished ? "/results/recent" : "/results/live"} />
      <LiveResultBoard
        eventId={id}
        teamA={teamA}
        teamB={teamB}
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
