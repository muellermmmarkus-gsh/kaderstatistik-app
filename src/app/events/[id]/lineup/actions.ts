"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FORMATIONS } from "./formations";

function parseFormation(value: FormDataEntryValue | null): string {
  const input = String(value ?? "").trim();
  return FORMATIONS.some((f) => f.key === input) ? input : FORMATIONS[0].key;
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
  const formation = parseFormation(formData.get("formation"));
  const assignments = parseAssignments(formData.get("assignments"));
  const benchFormation = parseFormation(formData.get("bench_formation"));
  const benchAssignments = parseAssignments(formData.get("bench_assignments"));

  const supabase = await createClient();
  const { error } = await supabase.from("lineups").upsert(
    {
      event_id: eventId,
      formation,
      assignments,
      bench_formation: benchFormation,
      bench_assignments: benchAssignments,
    },
    { onConflict: "event_id" },
  );
  if (error) throw new Error(`Aufstellung konnte nicht gespeichert werden: ${error.message}`);

  revalidatePath(`/events/${eventId}/lineup`);
}
