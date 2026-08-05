"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createField(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const lengthM = Number(formData.get("lengthM") ?? 0);
  const widthM = Number(formData.get("widthM") ?? 0);

  if (!name || !lengthM || !widthM) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("fields")
    .insert({ name, length_m: lengthM, width_m: widthM });
  if (error) throw new Error(`Spielfläche konnte nicht gespeichert werden: ${error.message}`);

  revalidatePath("/fields");
}

export async function deleteField(fieldId: string) {
  const supabase = await createClient();
  await supabase.from("fields").delete().eq("id", fieldId);
  revalidatePath("/fields");
}
