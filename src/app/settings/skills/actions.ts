"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidateSkillPages() {
  revalidatePath("/settings/skills");
  revalidatePath("/exercises");
  revalidatePath("/exercises/new");
  revalidatePath("/trainings");
  revalidatePath("/performance/update");
  revalidatePath("/performance/development");
}

export async function saveSkills(formData: FormData) {
  const raw = formData
    .getAll("focus")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const skills = [...new Set(raw)];

  const supabase = await createClient();

  await supabase.from("exercise_focuses").delete().not("id", "is", null);
  if (skills.length) {
    const { error } = await supabase
      .from("exercise_focuses")
      .insert(skills.map((label, index) => ({ label, sort_order: index })));
    if (error) {
      throw new Error(`Skills konnten nicht gespeichert werden: ${error.message}`);
    }
  }

  revalidateSkillPages();
}

// Skills werden als Freitext (nicht als Fremdschluessel) in exercises.haupt-
// zweck/nebenzweck, trainings.focus und performance_ratings.focus
// gespeichert. Eine Umbenennung muss daher ueberall nachgezogen werden,
// sonst wuerden bestehende Zuordnungen auf einen nicht mehr existierenden
// Namen zeigen.
export async function renameSkill(oldLabel: string, newLabel: string) {
  const trimmedNew = newLabel.trim();
  if (!trimmedNew) {
    throw new Error("Bitte einen Namen für das Skill angeben.");
  }
  if (trimmedNew === oldLabel) return;

  const supabase = await createClient();

  const { error: renameError } = await supabase
    .from("exercise_focuses")
    .update({ label: trimmedNew })
    .eq("label", oldLabel);
  if (renameError) {
    const message =
      renameError.code === "23505"
        ? `Ein Skill mit dem Namen "${trimmedNew}" existiert bereits.`
        : renameError.message;
    throw new Error(`Skill konnte nicht geändert werden: ${message}`);
  }

  await Promise.all([
    supabase.from("exercises").update({ hauptzweck: trimmedNew }).eq("hauptzweck", oldLabel),
    supabase.from("exercises").update({ nebenzweck: trimmedNew }).eq("nebenzweck", oldLabel),
    supabase.from("trainings").update({ focus: trimmedNew }).eq("focus", oldLabel),
    supabase.from("performance_ratings").update({ focus: trimmedNew }).eq("focus", oldLabel),
  ]);

  revalidateSkillPages();
}
