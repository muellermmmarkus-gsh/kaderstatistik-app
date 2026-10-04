"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { canEditExercise } from "./permissions";
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
    coaching: String(formData.get("coaching") ?? "").trim() || null,
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
  // Bild vor dem Anlegen hochladen: nachtraegliches Aendern der Uebung darf
  // nur der Admin. Die ID wird deshalb hier vergeben (Pfad im Storage).
  // created_by_team_id setzt die Datenbank (default current_team_id()).
  const id = crypto.randomUUID();
  const imageUrl = await uploadImage(supabase, id, formData);
  const { error } = await supabase
    .from("exercises")
    .insert({ ...exercise, id, image_url: imageUrl ?? null });
  if (error) throw new Error(`Übung konnte nicht gespeichert werden: ${error.message}`);

  const linkError = await activateForTeam(supabase, id);
  if (linkError) throw new Error(linkError);

  revalidateExerciseLists();
  redirect("/exercises?saved=1");
}

// Aendern und Loeschen: Admin alle Uebungen, Trainer nur die ihres Teams
// (zusaetzlich per RLS abgesichert).
async function requireCanEdit(exerciseId: string) {
  const supabase = await createClient();
  const [profile, { data: exercise }] = await Promise.all([
    getCurrentProfile(),
    supabase.from("exercises").select("created_by_team_id").eq("id", exerciseId).maybeSingle(),
  ]);
  if (!canEditExercise(profile, exercise?.created_by_team_id ?? null)) {
    throw new Error(
      "Diese Übung kann nur das Team ändern, das sie erstellt hat, oder der Administrator.",
    );
  }
}

function revalidateExerciseLists() {
  revalidatePath("/exercises");
  revalidatePath("/exercise-database");
}

// Neue Uebungen (und Kopien) gehoeren automatisch zum Team, das sie anlegt.
// team_id setzt die Datenbank (default current_team_id()).
async function activateForTeam(supabase: SupabaseClient, exerciseId: string) {
  const { error } = await supabase
    .from("team_exercises")
    .upsert({ exercise_id: exerciseId }, { onConflict: "team_id,exercise_id", ignoreDuplicates: true });
  return error ? `Übung konnte dem Team nicht zugeordnet werden: ${error.message}` : null;
}

/** Checkbox "In Team aktiv" in der Übungsdatenbank. */
export async function setExerciseActiveInTeam(exerciseId: string, active: boolean) {
  const supabase = await createClient();
  if (active) {
    const error = await activateForTeam(supabase, exerciseId);
    if (error) return error;
  } else {
    // RLS beschraenkt das Loeschen auf die Zeile des eigenen Teams.
    const { error } = await supabase.from("team_exercises").delete().eq("exercise_id", exerciseId);
    if (error) return `Änderung konnte nicht gespeichert werden: ${error.message}`;
  }
  revalidateExerciseLists();
  return null;
}

export async function updateExercise(exerciseId: string, formData: FormData) {
  await requireCanEdit(exerciseId);
  const exercise = parseExercise(formData);
  if (!exercise.name || !exercise.min_players || !exercise.max_players) return;

  const supabase = await createClient();
  const imageUrl = await uploadImage(supabase, exerciseId, formData);

  const { error } = await supabase
    .from("exercises")
    .update({
      ...exercise,
      ...(imageUrl ? { image_url: imageUrl } : {}),
    })
    .eq("id", exerciseId);
  if (error) throw new Error(`Übung konnte nicht gespeichert werden: ${error.message}`);

  revalidateExerciseLists();
  revalidatePath(`/exercises/${exerciseId}`);
  redirect("/exercises?saved=1");
}

// Entfernt das Bild einer Uebung sofort (roter X-Button im Aenderungsformular).
// Die Datei bleibt im Storage liegen, da Kopien einer Uebung dieselbe
// Bild-URL referenzieren koennen.
export async function removeExerciseImage(exerciseId: string) {
  await requireCanEdit(exerciseId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("exercises")
    .update({ image_url: null })
    .eq("id", exerciseId);
  if (error) throw new Error(`Bild konnte nicht entfernt werden: ${error.message}`);

  revalidateExerciseLists();
  revalidatePath(`/exercises/${exerciseId}`);
}

// Legt eine Kopie der Uebung mit dem Namen "Kopie von <Name>" an. Das Bild
// wird nur per URL referenziert (Uploads landen immer unter neuem Pfad und
// werden beim Loeschen/Ersetzen nicht aus dem Storage entfernt), daher ist
// das Teilen der Bild-URL unkritisch.
export async function duplicateExercise(exerciseId: string) {
  const supabase = await createClient();

  const { data: original, error: readError } = await supabase
    .from("exercises")
    .select(
      "name, aufbau, ablauf, coaching, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, field_id, image_url, source_url",
    )
    .eq("id", exerciseId)
    .single();
  if (readError || !original) {
    throw new Error(`Übung konnte nicht kopiert werden: ${readError?.message ?? "nicht gefunden"}`);
  }

  const { data: copy, error } = await supabase
    .from("exercises")
    .insert({ ...original, name: `Kopie von ${original.name}` })
    .select("id")
    .single();
  if (error) throw new Error(`Übung konnte nicht kopiert werden: ${error.message}`);
  const linkError = await activateForTeam(supabase, copy.id);
  if (linkError) throw new Error(linkError);

  revalidateExerciseLists();
}

// Nur der Admin: loescht die Uebung aus der Datenbank fuer alle Teams. Steckt
// sie noch in einem Trainingsplan, verhindert das der Fremdschluessel.
export async function deleteExercise(exerciseId: string, returnTo: string) {
  await requireCanEdit(exerciseId);
  const supabase = await createClient();
  const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);

  revalidateExerciseLists();
  revalidatePath(`/exercises/${exerciseId}`);
  if (error) {
    const message =
      error.code === "23503"
        ? "Die Übung wird noch in einem Trainingsplan verwendet und kann nicht gelöscht werden."
        : `Übung konnte nicht gelöscht werden: ${error.message}`;
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }
  redirect(`${returnTo}?saved=1`);
}
