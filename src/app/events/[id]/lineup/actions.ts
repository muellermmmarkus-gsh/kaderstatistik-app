"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_GAME_MODE, FORMATIONS_BY_MODE, isGameMode, type GameMode } from "./formations";

function parseMode(value: FormDataEntryValue | null): GameMode {
  const mode = Number(value);
  return isGameMode(mode) ? mode : DEFAULT_GAME_MODE;
}

// Nur Formationen des gewaehlten Spielmodus sind gueltig.
function parseFormation(value: FormDataEntryValue | null, mode: GameMode): string {
  const input = String(value ?? "").trim();
  const list = FORMATIONS_BY_MODE[mode];
  return list.some((f) => f.key === input) ? input : list[0].key;
}

function parseAssignments(value: FormDataEntryValue | null): Record<string, string> {
  const assignments: Record<string, string> = {};
  try {
    const parsed = JSON.parse(String(value ?? "{}"));
    if (parsed && typeof parsed === "object") {
      for (const [slotKey, playerId] of Object.entries(parsed)) {
        if (typeof playerId === "string" && playerId) assignments[slotKey] = playerId;
      }
    }
  } catch {
    return {};
  }
  return assignments;
}

export async function saveLineup(eventId: string, formData: FormData) {
  const supabase = await createClient();
  // Spiele laufen immer 6+1; nur bei Turnieren ist der Spielmodus waehlbar.
  const { data: event } = await supabase.from("events").select("type").eq("id", eventId).single();
  const mode = event?.type === "tournament" ? parseMode(formData.get("game_mode")) : DEFAULT_GAME_MODE;

  const { error } = await supabase.from("lineups").upsert(
    {
      event_id: eventId,
      game_mode: mode,
      formation: parseFormation(formData.get("formation"), mode),
      assignments: parseAssignments(formData.get("assignments")),
      bench_formation: parseFormation(formData.get("bench_formation"), mode),
      bench_assignments: parseAssignments(formData.get("bench_assignments")),
      third_formation: parseFormation(formData.get("third_formation"), mode),
      third_assignments: parseAssignments(formData.get("third_assignments")),
    },
    { onConflict: "event_id" },
  );
  if (error) throw new Error(`Aufstellung konnte nicht gespeichert werden: ${error.message}`);

  revalidatePath(`/events/${eventId}/lineup`);
  revalidatePath(`/results/report/${eventId}`);
}
