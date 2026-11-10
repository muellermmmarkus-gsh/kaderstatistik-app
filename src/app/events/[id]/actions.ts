"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadTrainingTypeKeys } from "@/lib/eventTypes";
import { SHIRT_NUMBER_MAX } from "@/lib/shirtNumbers";

async function persistAttendance(
  eventId: string,
  playerIds: string[],
  trainerIds: string[],
  formData: FormData,
) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("type")
    .eq("id", eventId)
    .single();
  const isGame = event?.type === "game";
  // Spiele und Turniere: Rueckennummer, Kapitaen, Torwart
  const isMatch = isGame || event?.type === "tournament";
  const trainingTypes = await loadTrainingTypeKeys(supabase);
  const isTraining = !!event && trainingTypes.includes(event.type);

  const attendanceRows = playerIds.map((playerId) => {
    const shirt = Number(formData.get(`shirt_${playerId}`) || NaN);
    return {
      player_id: playerId,
      event_id: eventId,
      present: formData.get(`present_player_${playerId}`) === "on",
      excused: formData.get(`excused_player_${playerId}`) === "on",
      registered: formData.get(`registered_player_${playerId}`) === "on",
      // Rueckennummer, Kapitaen und Torwart nur bei Spielen und Turnieren
      ...(isMatch && {
        is_captain: formData.get(`captain_player_${playerId}`) === "on",
        is_goalkeeper: formData.get(`goalkeeper_player_${playerId}`) === "on",
        shirt_number:
          Number.isInteger(shirt) && shirt >= 1 && shirt <= SHIRT_NUMBER_MAX ? shirt : null,
      }),
    };
  });

  if (isMatch) {
    const numbers = attendanceRows
      .map((row) => row.shirt_number)
      .filter((n): n is number => n != null);
    if (new Set(numbers).size !== numbers.length) {
      throw new Error("Jede Rückennummer darf pro Spiel nur einmal vergeben werden.");
    }
  }

  if (attendanceRows.length) {
    const { error } = await supabase
      .from("attendance")
      .upsert(attendanceRows, { onConflict: "player_id,event_id" });
    if (error) throw new Error(`Anwesenheit konnte nicht gespeichert werden: ${error.message}`);
  }

  if (isTraining && playerIds.length) {
    const assessments = playerIds.map((playerId) => ({
      event_id: eventId,
      player_id: playerId,
      performance: String(formData.get(`performance_${playerId}`) ?? "").trim() || null,
      motivation: String(formData.get(`motivation_${playerId}`) ?? "").trim() || null,
      discipline: String(formData.get(`discipline_${playerId}`) ?? "").trim() || null,
      player_notes:
        String(formData.get(`notes_${playerId}`) ?? "").trim().slice(0, 50) || null,
    }));
    const filled = assessments.filter(
      (a) => a.performance || a.motivation || a.discipline || a.player_notes,
    );
    const emptyPlayerIds = assessments
      .filter((a) => !filled.includes(a))
      .map((a) => a.player_id);

    if (filled.length) {
      const { error } = await supabase
        .from("attendance_assessments")
        .upsert(filled, { onConflict: "event_id,player_id" });
      if (error) throw new Error(`Bewertungen konnten nicht gespeichert werden: ${error.message}`);
    }
    if (emptyPlayerIds.length) {
      await supabase
        .from("attendance_assessments")
        .delete()
        .eq("event_id", eventId)
        .in("player_id", emptyPlayerIds);
    }
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

  // Bei Spielen werden die Tore ausschliesslich ueber das Live-Ergebnis
  // gepflegt (siehe syncGoals in app/results/actions.ts).
  if (isGame) return;

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

/** Speichert die Anwesenheit und springt zum Trainingsplatzplan des Termins. */
export async function saveAttendanceAndOpenFieldPlan(
  eventId: string,
  playerIds: string[],
  trainerIds: string[],
  formData: FormData,
) {
  await persistAttendance(eventId, playerIds, trainerIds, formData);
  revalidatePath(`/events/${eventId}`);
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("event_date").eq("id", eventId).single();
  redirect(event ? `/field-planning?date=${event.event_date}` : "/field-planning");
}

/** Aendert die Saison eines Termins; nur Saisons des eigenen Teams (RLS). */
export async function updateEventSeason(eventId: string, season: string): Promise<{ error?: string }> {
  const name = season.trim();
  if (!name) return { error: "Bitte eine Saison wählen." };
  const supabase = await createClient();
  const { data: known } = await supabase.from("seasons").select("name").eq("name", name).limit(1).maybeSingle();
  if (!known) return { error: "Diese Saison gibt es nicht." };
  const { data, error } = await supabase
    .from("events")
    .update({ season: name })
    .eq("id", eventId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: `Saison konnte nicht geändert werden: ${error?.message ?? "keine Berechtigung"}` };
  // Saison steckt in Listen, Kalender und Statistik.
  revalidatePath("/", "layout");
  return {};
}

/** Aendert die Startuhrzeit eines Termins ("HH:MM") oder entfernt sie (""). */
export async function updateEventTime(eventId: string, time: string): Promise<{ error?: string }> {
  const value = time.trim();
  if (value && !/^\d{2}:\d{2}$/.test(value)) return { error: "Ungültige Uhrzeit." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .update({ event_time: value || null })
    .eq("id", eventId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: `Uhrzeit konnte nicht geändert werden: ${error?.message ?? "keine Berechtigung"}` };
  // Uhrzeit steht in Terminliste, Kalender, Live-Ergebnis und Spielberichten.
  revalidatePath("/", "layout");
  return {};
}
