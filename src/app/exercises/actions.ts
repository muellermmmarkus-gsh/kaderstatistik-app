"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const categories = ["aufwaermen", "spielen", "ueben", "cooldown"];

function parseExercise(formData: FormData) {
  const category = String(formData.get("category") ?? "ueben");
  const fieldId = String(formData.get("fieldId") ?? "").trim();
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();

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
    category: categories.includes(category) ? category : "ueben",
    field_id: fieldId || null,
    source_url: sourceUrl || null,
  };
}

async function uploadImage(
  supabase: SupabaseClient,
  exerciseId: string,
  formData: FormData,
): Promise<string | undefined> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return undefined;

  const extension = file.name.split(".").pop() || "jpg";
  const path = `${exerciseId}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from("exercise-images")
    .upload(path, file, { upsert: true });
  if (error) return undefined;

  const { data } = supabase.storage.from("exercise-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function createExercise(formData: FormData) {
  const exercise = parseExercise(formData);
  if (!exercise.name || !exercise.min_players || !exercise.max_players) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .insert(exercise)
    .select("id")
    .single();
  if (error) throw new Error(`Übung konnte nicht gespeichert werden: ${error.message}`);

  if (data) {
    const imageUrl = await uploadImage(supabase, data.id, formData);
    if (imageUrl) {
      await supabase.from("exercises").update({ image_url: imageUrl }).eq("id", data.id);
    }
  }

  revalidatePath("/exercises");
  redirect("/exercises?saved=1");
}

export async function updateExercise(exerciseId: string, formData: FormData) {
  const exercise = parseExercise(formData);
  if (!exercise.name || !exercise.min_players || !exercise.max_players) return;

  const supabase = await createClient();
  const removeImage = formData.get("removeImage") === "on";
  const imageUrl = await uploadImage(supabase, exerciseId, formData);

  const { error } = await supabase
    .from("exercises")
    .update({
      ...exercise,
      ...(imageUrl
        ? { image_url: imageUrl }
        : removeImage
          ? { image_url: null }
          : {}),
    })
    .eq("id", exerciseId);
  if (error) throw new Error(`Übung konnte nicht gespeichert werden: ${error.message}`);

  revalidatePath("/exercises");
  revalidatePath(`/exercises/${exerciseId}`);
  redirect("/exercises?saved=1");
}

export async function deleteExercise(exerciseId: string) {
  const supabase = await createClient();
  await supabase.from("exercises").delete().eq("id", exerciseId);
  revalidatePath("/exercises");
}
