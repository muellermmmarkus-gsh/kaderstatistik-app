"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addSeason(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase.from("seasons").insert({ name });
  if (error) throw new Error(`Saison konnte nicht gespeichert werden: ${error.message}`);

  revalidatePath("/seasons");
  revalidatePath("/events");
}

export async function deleteSeason(seasonId: string) {
  const supabase = await createClient();
  await supabase.from("seasons").delete().eq("id", seasonId);

  revalidatePath("/seasons");
  revalidatePath("/events");
}

export async function setDefaultSeason(seasonId: string) {
  const supabase = await createClient();

  await supabase.from("seasons").update({ is_default: false }).eq("is_default", true);
  await supabase.from("seasons").update({ is_default: true }).eq("id", seasonId);

  revalidatePath("/seasons");
  revalidatePath("/events");
}
