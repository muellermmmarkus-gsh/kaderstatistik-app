import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import BackButton from "@/components/BackButton";
import LineupBuilder from "./LineupBuilder";
import { saveLineup } from "./actions";
import { gameModeLabel, isGameMode } from "./formations";

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
    .is("deleted_at", null)
    .single();

  if (!event) notFound();
  // Aufstellung gibt es bei Spielen (immer 6+1) und Turnieren (Spielmodus waehlbar).
  if (event.type !== "game" && event.type !== "tournament") notFound();
  const isTournament = event.type === "tournament";

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
        .select(
          "game_mode, formation, assignments, bench_formation, bench_assignments, third_formation, third_assignments",
        )
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
  const initialThirdAssignments =
    (lineup?.third_assignments as Record<string, string> | null) ?? {};
  const assignedIds = new Set([
    ...Object.values(initialAssignments),
    ...Object.values(initialBenchAssignments),
    ...Object.values(initialThirdAssignments),
  ]);
  // Bei einem Turnier ohne gespeicherte Aufstellung ist noch kein Spielmodus gewaehlt.
  const savedMode = lineup && isGameMode(Number(lineup.game_mode)) ? Number(lineup.game_mode) : null;
  const initialMode = (savedMode ?? (isTournament ? null : 6)) as 4 | 5 | 6 | null;

  // Fuer die Spieler-Auswahl zaehlen als "angemeldet" markierte Spieler,
  // zusaetzlich bereits zugewiesene Spieler (falls die Anmeldung im
  // Nachgang wieder entfernt wurde) - so geht keine bestehende Zuordnung
  // stillschweigend verloren.
  const registeredPlayers = (players ?? []).filter(
    (p) => registeredIds.has(p.id) || assignedIds.has(p.id),
  );
  // Ist noch niemand angemeldet, stehen alle aktiven Spieler zur Auswahl -
  // sonst bliebe die Aufstellung leer.
  const nobodyRegistered = !registeredPlayers.length;
  const eligiblePlayers = nobodyRegistered ? (players ?? []) : registeredPlayers;

  const action = saveLineup.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <BackButton href={`/events/${id}`} />
      <h1 className="mb-1 text-xl font-semibold">Aufstellung</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {isTournament ? "Turnier" : "Spiel"} – {event.event_date}
        {event.opponent ? ` · gegen ${event.opponent}` : ""}
        {isTournament && savedMode ? ` · Spielmodus ${gameModeLabel(savedMode)}` : ""}
      </p>

      {!canWrite && (
        <p className="mb-6 text-sm text-zinc-500">
          Du hast Nur-Lese-Zugriff. Änderungen können nur Trainer vornehmen.
        </p>
      )}

      {nobodyRegistered && (
        <p className="mb-6 text-sm text-zinc-500">
          Noch keine Spieler für diesen Termin als „angemeldet“ markiert – es stehen alle aktiven
          Spieler zur Auswahl. Wer im Termin als „angemeldet“ markiert ist, wird hier ausschließlich
          angeboten.
        </p>
      )}

      <LineupBuilder
        players={eligiblePlayers}
        isTournament={isTournament}
        initialMode={initialMode}
        initialBoards={[
          { formation: lineup?.formation, assignments: initialAssignments },
          { formation: lineup?.bench_formation, assignments: initialBenchAssignments },
          { formation: lineup?.third_formation, assignments: initialThirdAssignments },
        ]}
        canWrite={canWrite}
        action={action}
      />
    </div>
  );
}
