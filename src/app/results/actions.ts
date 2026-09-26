"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getShirtNumbers, SHIRT_NUMBER_MAX } from "@/lib/shirtNumbers";
import {
  ownSideOf,
  teamsForEvent,
  type GoalEntry,
  type GoalKind,
  type TeamSide,
} from "./teams";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type GoalEntryInput = Omit<GoalEntry, "id">;

function revalidateResults(eventId: string) {
  revalidatePath("/results/live");
  revalidatePath(`/results/live/${eventId}`);
  revalidatePath("/results/recent");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/stats");
}

// Das Ergebnis-Objekt eines Spiels wird erst beim ersten Speichern (oder
// beim Beenden) angelegt, damit das blosse Oeffnen der Live-Seite nichts
// in die Datenbank schreibt.
async function ensureMatchResult(
  supabase: SupabaseClient,
  eventId: string,
): Promise<{ id: string; teamA: string }> {
  const { data: existing } = await supabase
    .from("match_results")
    .select("id, team_a")
    .eq("event_id", eventId)
    .maybeSingle();
  if (existing) return { id: existing.id as string, teamA: existing.team_a as string };

  const { data: event } = await supabase
    .from("events")
    .select("opponent")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single();
  if (!event) throw new Error("Spiel nicht gefunden.");

  const [teamA, teamB] = teamsForEvent(event.opponent);
  const { data, error } = await supabase
    .from("match_results")
    .insert({ event_id: eventId, team_a: teamA, team_b: teamB })
    .select("id")
    .single();
  if (error) {
    // Parallel von einem anderen Geraet angelegt (unique event_id).
    if (error.code === "23505") return ensureMatchResult(supabase, eventId);
    throw new Error(`Spielergebnis konnte nicht angelegt werden: ${error.message}`);
  }
  return { id: data.id as string, teamA };
}

// Die Tabelle goals (Tore pro Spieler und Spiel, Grundlage der Statistik)
// wird bei Spielen ausschliesslich aus den Live-Ergebnis-Eintraegen
// abgeleitet: jedes "Tor" eines zugeordneten eigenen Spielers zaehlt.
async function syncGoals(supabase: SupabaseClient, eventId: string) {
  const { data: result } = await supabase
    .from("match_results")
    .select("team_a, match_goal_entries(team, kind, player_id)")
    .eq("event_id", eventId)
    .maybeSingle();

  const counts = new Map<string, number>();
  if (result) {
    const ownSide = ownSideOf(result.team_a as string);
    for (const e of result.match_goal_entries ?? []) {
      if (e.team === ownSide && e.kind === "goal" && e.player_id) {
        counts.set(e.player_id, (counts.get(e.player_id) ?? 0) + 1);
      }
    }
  }

  const { error: deleteError } = await supabase.from("goals").delete().eq("event_id", eventId);
  if (deleteError) throw new Error(`Tore konnten nicht aktualisiert werden: ${deleteError.message}`);
  if (counts.size) {
    const { error } = await supabase.from("goals").insert(
      [...counts].map(([playerId, goalCount]) => ({
        player_id: playerId,
        event_id: eventId,
        goal_count: goalCount,
      })),
    );
    if (error) throw new Error(`Tore konnten nicht aktualisiert werden: ${error.message}`);
  }
}

type EntryRow = {
  id: string;
  minute: string | null;
  team: TeamSide;
  kind: GoalKind;
  shirt_number: number | null;
  player_id: string | null;
  note: string | null;
};

function toGoalEntry(row: EntryRow): GoalEntry {
  return {
    id: row.id,
    minute: row.minute ?? "",
    team: row.team,
    kind: row.kind,
    shirtNumber: row.shirt_number,
    playerId: row.player_id,
    note: row.note ?? "",
  };
}

export async function saveGoalEntry(
  eventId: string,
  entryId: string | null,
  input: GoalEntryInput,
): Promise<GoalEntry> {
  const supabase = await createClient();
  const result = await ensureMatchResult(supabase, eventId);

  const team: TeamSide = input.team === "b" ? "b" : "a";
  const kind: GoalKind = input.kind === "own_goal" ? "own_goal" : "goal";
  const shirt = Number(input.shirtNumber);
  let shirtNumber =
    Number.isInteger(shirt) && shirt >= 1 && shirt <= SHIRT_NUMBER_MAX ? shirt : null;
  let playerId: string | null = null;

  // Spieler nur fuer die eigene Mannschaft; die Rueckennummer kommt dann
  // aus dem Spieltermin.
  if (team === ownSideOf(result.teamA) && input.playerId) {
    const { data: event } = await supabase
      .from("events")
      .select("event_date")
      .eq("id", eventId)
      .single();
    const { numbers } = await getShirtNumbers(supabase, eventId, event?.event_date ?? "");
    playerId = input.playerId;
    shirtNumber = numbers.get(playerId) ?? shirtNumber;
  }

  const values = {
    minute: String(input.minute ?? "").trim().slice(0, 20) || null,
    team,
    kind,
    shirt_number: shirtNumber,
    player_id: playerId,
    note: String(input.note ?? "").trim().slice(0, 500) || null,
  };

  const query = entryId
    ? supabase.from("match_goal_entries").update(values).eq("id", entryId)
    : supabase.from("match_goal_entries").insert({ ...values, match_result_id: result.id });

  const { data, error } = await query
    .select("id, minute, team, kind, shirt_number, player_id, note")
    .single();
  if (error) throw new Error(`Eintrag konnte nicht gespeichert werden: ${error.message}`);

  await syncGoals(supabase, eventId);
  revalidateResults(eventId);
  return toGoalEntry(data as EntryRow);
}

export async function deleteGoalEntry(eventId: string, entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("match_goal_entries").delete().eq("id", entryId);
  if (error) throw new Error(`Eintrag konnte nicht gelöscht werden: ${error.message}`);

  await syncGoals(supabase, eventId);
  revalidateResults(eventId);
}

export async function finishMatch(eventId: string) {
  const supabase = await createClient();
  const result = await ensureMatchResult(supabase, eventId);

  const { error } = await supabase
    .from("match_results")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", result.id);
  if (error) throw new Error(`Spiel konnte nicht beendet werden: ${error.message}`);

  revalidateResults(eventId);
  redirect("/results/recent?saved=1");
}

// Loescht das archivierte Ergebnis inklusive aller Tor-Eintraege (per
// on delete cascade). Der Spieltermin selbst bleibt erhalten.
export async function deleteMatchResult(resultId: string, eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("match_results").delete().eq("id", resultId);
  if (error) throw new Error(`Ergebnis konnte nicht gelöscht werden: ${error.message}`);

  await syncGoals(supabase, eventId);
  revalidateResults(eventId);
}
