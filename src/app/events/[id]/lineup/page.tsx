import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import BackButton from "@/components/BackButton";
import LineupBuilder from "./LineupBuilder";
import { saveLineup } from "./actions";

export default async function LineupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, type, event_date, opponent")
    .eq("id", id)
    .single();

  if (!event) notFound();
  // Aufstellung ist nur bei Spielterminen relevant.
  if (event.type !== "game") notFound();

  const [{ data: players }, { data: attendance }, { data: lineup }, canWrite] =
    await Promise.all([
      supabase
        .from("players")
        .select("id, first_name, last_name")
        .eq("active", true)
        .order("last_name"),
      supabase.from("attendance").select("player_id, registered").eq("event_id", id),
      supabase
        .from("lineups")
        .select("formation, assignments, bench_formation, bench_assignments")
        .eq("event_id", id)
        .maybeSingle(),
      isTrainer(),
    ]);

  const registeredIds = new Set(
    (attendance ?? []).filter((a) => a.registered).map((a) => a.player_id),
  );
  const initialAssignments = (lineup?.assignments as Record<string, string> | null) ?? {};
  const initialBenchAssignments =
    (lineup?.bench_assignments as Record<string, string> | null) ?? {};
  const assignedIds = new Set([
    ...Object.values(initialAssignments),
    ...Object.values(initialBenchAssignments),
  ]);

  // Fuer die Spieler-Auswahl zaehlen als "angemeldet" markierte Spieler,
  // zusaetzlich bereits zugewiesene Spieler (falls die Anmeldung im
  // Nachgang wieder entfernt wurde) - so geht keine bestehende Zuordnung
  // stillschweigend verloren.
  const eligiblePlayers = (players ?? []).filter(
    (p) => registeredIds.has(p.id) || assignedIds.has(p.id),
  );

  const action = saveLineup.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <BackButton href={`/events/${id}`} />
      <h1 className="mb-1 text-xl font-semibold">Aufstellung</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Spiel – {event.event_date}
        {event.opponent ? ` · gegen ${event.opponent}` : ""}
      </p>

      {!canWrite && (
        <p className="mb-6 text-sm text-zinc-500">
          Du hast Nur-Lese-Zugriff. Änderungen können nur Trainer vornehmen.
        </p>
      )}

      {!eligiblePlayers.length && (
        <p className="mb-6 text-sm text-zinc-500">
          Noch keine Spieler für diesen Termin als „angemeldet“ markiert.
        </p>
      )}

      <LineupBuilder
        players={eligiblePlayers}
        initialFormation={lineup?.formation}
        initialAssignments={initialAssignments}
        initialBenchFormation={lineup?.bench_formation ?? undefined}
        initialBenchAssignments={initialBenchAssignments}
        canWrite={canWrite}
        action={action}
      />
    </div>
  );
}
