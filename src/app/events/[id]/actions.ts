"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function persistAttendance(
  eventId: string,
  playerIds: string[],
  trainerIds: string[],
  formData: FormData,
) {
  const supabase = await createClient();

  const attendanceRows = playerIds.map((playerId) => ({
    player_id: playerId,
    event_id: eventId,
    present: formData.get(`present_player_${playerId}`) === "on",
    performance: String(formData.get(`performance_${playerId}`) ?? "").trim() || null,
    motivation: String(formData.get(`motivation_${playerId}`) ?? "").trim() || null,
    discipline: String(formData.get(`discipline_${playerId}`) ?? "").trim() || null,
    player_notes:
      String(formData.get(`notes_${playerId}`) ?? "").trim().slice(0, 50) || null,
  }));

  if (attendanceRows.length) {
    const { error } = await supabase
      .from("attendance")
      .upsert(attendanceRows, { onConflict: "player_id,event_id" });
    if (error) throw new Error(`Anwesenheit konnte nicht gespeichert werden: ${error.message}`);
  }

  const trainerAttendanceRows = trainerIds.map((trainerId) => ({
    trainer_id: trainerId,
    event_id: eventId,
    present: formData.get(`present_trainer_${trainerId}`) === "on",
    confirmed: formData.get(`confirmed_trainer_${trainerId}`) === "on",
  }));

  if (trainerAttendanceRows.length) {
    const { error } = await supabase
      .from("trainer_attendance")
      .upsert(trainerAttendanceRows, { onConflict: "trainer_id,event_id" });
    if (error) throw new Error(`Trainer-Anwesenheit konnte nicht gespeichert werden: ${error.message}`);
  }

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
}

export async function saveAttendance(
  eventId: string,
  playerIds: string[],
  trainerIds: string[],
  formData: FormData,
) {
  await persistAttendance(eventId, playerIds, trainerIds, formData);
  revalidatePath(`/events/${eventId}`);
}

export async function saveAttendanceAndReturn(
  eventId: string,
  playerIds: string[],
  trainerIds: string[],
  formData: FormData,
) {
  await persistAttendance(eventId, playerIds, trainerIds, formData);
  revalidatePath("/events");
  redirect("/events");
}
