"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createTraining(formData: FormData) {
  const trainingDate = String(formData.get("trainingDate") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const exerciseIds = formData.getAll("exercise_id").map(String);
  const durations = formData.getAll("duration_minutes").map(String);

  if (!trainingDate || !exerciseIds.length) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: training } = await supabase
    .from("trainings")
    .insert({
      training_date: trainingDate,
      notes: notes || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (!training) {
    revalidatePath("/trainings");
    return;
  }

  const rows = exerciseIds
    .map((exerciseId, index) => ({
      training_id: training.id,
      exercise_id: exerciseId,
      sort_order: index,
      duration_minutes: Number(durations[index] ?? 0),
    }))
    .filter((row) => row.exercise_id && row.duration_minutes > 0);

  if (rows.length) {
    await supabase.from("training_exercises").insert(rows);
  }

  revalidatePath("/trainings");
  redirect(`/trainings/${training.id}`);
}

export async function deleteTraining(trainingId: string) {
  const supabase = await createClient();
  await supabase.from("trainings").delete().eq("id", trainingId);
  revalidatePath("/trainings");
}
