"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addPlayer(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();

  if (!firstName || !lastName) return;

  const supabase = await createClient();
  const { error } = await supabase.from("players").insert({
    first_name: firstName,
    last_name: lastName,
    birth_date: birthDate || null,
  });
  if (error) throw new Error(`Spieler konnte nicht gespeichert werden: ${error.message}`);

  revalidatePath("/players");
}

export async function togglePlayerActive(playerId: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from("players").update({ active }).eq("id", playerId);
  revalidatePath("/players");
}
