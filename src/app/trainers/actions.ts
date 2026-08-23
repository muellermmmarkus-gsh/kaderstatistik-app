"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addTrainer(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();

  if (!firstName || !lastName) return;

  const supabase = await createClient();
  const { error } = await supabase.from("trainers").insert({
    first_name: firstName,
    last_name: lastName,
    birth_date: birthDate || null,
  });
  if (error) throw new Error(`Trainer konnte nicht gespeichert werden: ${error.message}`);

  revalidatePath("/trainers");
}

export async function updateTrainerBirthDate(trainerId: string, formData: FormData) {
  const birthDate = String(formData.get("birthDate") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("trainers")
    .update({ birth_date: birthDate || null })
    .eq("id", trainerId);
  if (error) throw new Error(`Geburtsdatum konnte nicht gespeichert werden: ${error.message}`);

  revalidatePath("/trainers");
}

export async function toggleTrainerActive(trainerId: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from("trainers").update({ active }).eq("id", trainerId);
  revalidatePath("/trainers");
}
