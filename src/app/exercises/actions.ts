"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function parseExercise(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    hauptzweck: String(formData.get("hauptzweck") ?? "").trim(),
    nebenzweck: String(formData.get("nebenzweck") ?? "").trim() || null,
    aufbau: String(formData.get("aufbau") ?? "").trim(),
    ablauf: String(formData.get("ablauf") ?? "").trim(),
    min_players: Number(formData.get("minPlayers") ?? 0),
    max_players: Number(formData.get("maxPlayers") ?? 0),
    small_goals: Number(formData.get("smallGoals") ?? 0),
    mini_goals: Number(formData.get("miniGoals") ?? 0),
  };
}

export async function createExercise(formData: FormData) {
  const exercise = parseExercise(formData);
  if (!exercise.name || !exercise.min_players || !exercise.max_players) return;

  const supabase = await createClient();
  await supabase.from("exercises").insert(exercise);

  revalidatePath("/exercises");
  redirect("/exercises");
}

export async function updateExercise(exerciseId: string, formData: FormData) {
  const exercise = parseExercise(formData);
  if (!exercise.name || !exercise.min_players || !exercise.max_players) return;

  const supabase = await createClient();
  await supabase.from("exercises").update(exercise).eq("id", exerciseId);

  revalidatePath("/exercises");
  revalidatePath(`/exercises/${exerciseId}`);
  redirect("/exercises");
}

export async function deleteExercise(exerciseId: string) {
  const supabase = await createClient();
  await supabase.from("exercises").delete().eq("id", exerciseId);
  revalidatePath("/exercises");
}
