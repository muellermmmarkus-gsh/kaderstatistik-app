"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FORMATIONS } from "./formations";

export async function saveLineup(eventId: string, formData: FormData) {
  const formationInput = String(formData.get("formation") ?? "").trim();
  const formation = FORMATIONS.some((f) => f.key === formationInput)
    ? formationInput
    : FORMATIONS[0].key;

  let assignments: Record<string, string> = {};
  try {
    const parsed = JSON.parse(String(formData.get("assignments") ?? "{}"));
    if (parsed && typeof parsed === "object") {
      for (const [slotKey, playerId] of Object.entries(parsed)) {
        if (typeof playerId === "string" && playerId) assignments[slotKey] = playerId;
      }
    }
  } catch {
    assignments = {};
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("lineups")
    .upsert({ event_id: eventId, formation, assignments }, { onConflict: "event_id" });
  if (error) throw new Error(`Aufstellung konnte nicht gespeichert werden: ${error.message}`);

  revalidatePath(`/events/${eventId}/lineup`);
}
