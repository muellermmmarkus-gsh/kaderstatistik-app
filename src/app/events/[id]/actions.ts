"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveAttendance(
  eventId: string,
  playerIds: string[],
  formData: FormData,
) {
  const supabase = await createClient();

  const attendanceRows = playerIds.map((playerId) => ({
    player_id: playerId,
    event_id: eventId,
    present: formData.get(`present_${playerId}`) === "on",
  }));

  await supabase
    .from("attendance")
    .upsert(attendanceRows, { onConflict: "player_id,event_id" });

  const goalsRows = playerIds
    .map((playerId) => ({
      player_id: playerId,
      event_id: eventId,
      goal_count: Number(formData.get(`goals_${playerId}`) ?? 0),
    }))
    .filter((row) => row.goal_count > 0);

  // Vorherige Tore fuer dieses Spiel entfernen, damit auf 0 gesetzte
  // Spieler nicht mit einem alten Wert stehen bleiben.
  await supabase.from("goals").delete().eq("event_id", eventId);
  if (goalsRows.length) {
    await supabase.from("goals").insert(goalsRows);
  }

  revalidatePath(`/events/${eventId}`);
}
