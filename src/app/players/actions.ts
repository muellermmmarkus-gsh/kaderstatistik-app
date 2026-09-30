"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addPlayer(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const passnummer = String(formData.get("passnummer") ?? "").trim();

  if (!firstName || !lastName) return;

  const supabase = await createClient();
  const { data: player, error } = await supabase
    .from("players")
    .insert({ first_name: firstName, last_name: lastName })
    .select("id")
    .single();
  if (error) throw new Error(`Spieler konnte nicht gespeichert werden: ${error.message}`);

  if (birthDate || passnummer) {
    const { error: privateError } = await supabase.from("player_private").insert({
      player_id: player.id,
      birth_date: birthDate || null,
      passnummer: passnummer || null,
    });
    if (privateError) {
      throw new Error(`Geburtsdatum/Passnummer konnten nicht gespeichert werden: ${privateError.message}`);
    }
  }

  revalidatePath("/players");
}

export async function updatePlayerBirthDate(playerId: string, formData: FormData) {
  const birthDate = String(formData.get("birthDate") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("player_private")
    .upsert({ player_id: playerId, birth_date: birthDate || null }, { onConflict: "player_id" });
  if (error) throw new Error(`Geburtsdatum konnte nicht gespeichert werden: ${error.message}`);

  revalidatePath("/players");
}

export async function togglePlayerActive(playerId: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from("players").update({ active }).eq("id", playerId);
  revalidatePath("/players");
}

export async function deletePlayer(playerId: string) {
  const supabase = await createClient();
  await supabase.from("players").delete().eq("id", playerId);
  revalidatePath("/players");
}

// Fuer Spieler, die den Verein verlassen: persoenliche Daten und Bewertungen
// loeschen, Anwesenheiten/Tore aber anonym behalten, damit die
// Mannschaftsstatistik vergangener Saisons unveraendert bleibt.
export async function anonymizePlayer(playerId: string) {
  const supabase = await createClient();

  for (const table of ["player_private", "attendance_assessments", "performance_ratings"]) {
    const { error } = await supabase.from(table).delete().eq("player_id", playerId);
    if (error) throw new Error(`Spieler konnte nicht anonymisiert werden: ${error.message}`);
  }

  // Eindeutiger Nachname, da Statistiken teils nach Namen gruppieren.
  const { error } = await supabase
    .from("players")
    .update({
      first_name: "Ehemaliger",
      last_name: `Spieler ${playerId.slice(0, 4).toUpperCase()}`,
      active: false,
    })
    .eq("id", playerId);
  if (error) throw new Error(`Spieler konnte nicht anonymisiert werden: ${error.message}`);

  revalidatePath("/players");
}
