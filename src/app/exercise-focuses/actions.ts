"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveExerciseFocuses(formData: FormData) {
  const raw = formData
    .getAll("focus")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const focuses = [...new Set(raw)];

  const supabase = await createClient();

  await supabase.from("exercise_focuses").delete().not("id", "is", null);
  if (focuses.length) {
    const { error } = await supabase
      .from("exercise_focuses")
      .insert(focuses.map((label, index) => ({ label, sort_order: index })));
    if (error) {
      throw new Error(`Übungsschwerpunkte konnten nicht gespeichert werden: ${error.message}`);
    }
  }

  revalidatePath("/exercise-focuses");
  revalidatePath("/exercises");
  revalidatePath("/exercises/new");
}
