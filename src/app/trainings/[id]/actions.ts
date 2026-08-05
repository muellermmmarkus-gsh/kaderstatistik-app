"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveTrainingPlan(eventId: string, formData: FormData) {
  const focus = String(formData.get("focus") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const exerciseIds = formData.getAll("exercise_id").map(String);
  const durations = formData.getAll("duration_minutes").map(String);

  const supabase = await createClient();

  const { data: training, error: upsertError } = await supabase
    .from("trainings")
    .upsert(
      { event_id: eventId, focus: focus || null, notes: notes || null },
      { onConflict: "event_id" },
    )
    .select("id")
    .single();
  if (upsertError) throw new Error(`Trainingsplan konnte nicht gespeichert werden: ${upsertError.message}`);
  if (!training) return;

  const rows = exerciseIds
    .map((exerciseId, index) => ({
      training_id: training.id,
      exercise_id: exerciseId,
      sort_order: index,
      duration_minutes: Number(durations[index] ?? 0),
    }))
    .filter((row) => row.exercise_id && row.duration_minutes > 0);

  // Bestehenden Plan ersetzen, damit entfernte Uebungen nicht stehen bleiben.
  await supabase.from("training_exercises").delete().eq("training_id", training.id);
  if (rows.length) {
    const { error } = await supabase.from("training_exercises").insert(rows);
    if (error) throw new Error(`Übungen konnten nicht gespeichert werden: ${error.message}`);
  }

  revalidatePath(`/trainings/${eventId}`);
  revalidatePath("/trainings");
}
