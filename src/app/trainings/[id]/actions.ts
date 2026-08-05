"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateTraining(trainingId: string, formData: FormData) {
  const trainingDate = String(formData.get("trainingDate") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const exerciseIds = formData.getAll("exercise_id").map(String);
  const durations = formData.getAll("duration_minutes").map(String);

  if (!trainingDate) return;

  const supabase = await createClient();

  await supabase
    .from("trainings")
    .update({ training_date: trainingDate, notes: notes || null })
    .eq("id", trainingId);

  const rows = exerciseIds
    .map((exerciseId, index) => ({
      training_id: trainingId,
      exercise_id: exerciseId,
      sort_order: index,
      duration_minutes: Number(durations[index] ?? 0),
    }))
    .filter((row) => row.exercise_id && row.duration_minutes > 0);

  // Bestehenden Plan ersetzen, damit entfernte Uebungen nicht stehen bleiben.
  await supabase.from("training_exercises").delete().eq("training_id", trainingId);
  if (rows.length) {
    await supabase.from("training_exercises").insert(rows);
  }

  revalidatePath(`/trainings/${trainingId}`);
  revalidatePath("/trainings");
}

export async function deleteTrainingAction(trainingId: string) {
  const supabase = await createClient();
  await supabase.from("trainings").delete().eq("id", trainingId);
  revalidatePath("/trainings");
  redirect("/trainings");
}
