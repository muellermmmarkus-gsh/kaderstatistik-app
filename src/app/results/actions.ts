"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { teamsForEvent, type GoalEntry, type GoalKind, type TeamSide } from "./teams";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type GoalEntryInput = Omit<GoalEntry, "id">;

function revalidateResults(eventId: string) {
  revalidatePath("/results/live");
  revalidatePath(`/results/live/${eventId}`);
  revalidatePath("/results/recent");
}

// Das Ergebnis-Objekt eines Spiels wird erst beim ersten Speichern (oder
// beim Beenden) angelegt, damit das blosse Oeffnen der Live-Seite nichts
// in die Datenbank schreibt.
async function ensureMatchResult(supabase: SupabaseClient, eventId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("match_results")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();
  if (existing) return existing.id as string;

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
  return data.id as string;
}

function sanitize(input: GoalEntryInput) {
  const team: TeamSide = input.team === "b" ? "b" : "a";
  const kind: GoalKind = input.kind === "own_goal" ? "own_goal" : "goal";
  const shirt = Number(input.shirtNumber);
  return {
    minute: String(input.minute ?? "").trim().slice(0, 20) || null,
    team,
    kind,
    shirt_number: Number.isInteger(shirt) && shirt >= 1 && shirt <= 20 ? shirt : null,
    note: String(input.note ?? "").trim().slice(0, 500) || null,
  };
}

type EntryRow = {
  id: string;
  minute: string | null;
  team: TeamSide;
  kind: GoalKind;
  shirt_number: number | null;
  note: string | null;
};

function toGoalEntry(row: EntryRow): GoalEntry {
  return {
    id: row.id,
    minute: row.minute ?? "",
    team: row.team,
    kind: row.kind,
    shirtNumber: row.shirt_number,
    note: row.note ?? "",
  };
}

export async function saveGoalEntry(
  eventId: string,
  entryId: string | null,
  input: GoalEntryInput,
): Promise<GoalEntry> {
  const supabase = await createClient();
  const values = sanitize(input);

  const query = entryId
    ? supabase.from("match_goal_entries").update(values).eq("id", entryId)
    : supabase
        .from("match_goal_entries")
        .insert({ ...values, match_result_id: await ensureMatchResult(supabase, eventId) });

  const { data, error } = await query
    .select("id, minute, team, kind, shirt_number, note")
    .single();
  if (error) throw new Error(`Eintrag konnte nicht gespeichert werden: ${error.message}`);

  revalidateResults(eventId);
  return toGoalEntry(data as EntryRow);
}

export async function deleteGoalEntry(eventId: string, entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("match_goal_entries").delete().eq("id", entryId);
  if (error) throw new Error(`Eintrag konnte nicht gelöscht werden: ${error.message}`);

  revalidateResults(eventId);
}

export async function finishMatch(eventId: string) {
  const supabase = await createClient();
  const resultId = await ensureMatchResult(supabase, eventId);

  const { error } = await supabase
    .from("match_results")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", resultId);
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

  revalidateResults(eventId);
}
