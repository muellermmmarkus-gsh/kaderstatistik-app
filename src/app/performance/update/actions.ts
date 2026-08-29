"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function savePerformanceUpdate(
  updateId: string | null,
  playerIds: string[],
  focuses: string[],
  formData: FormData,
) {
  const updateDate = String(formData.get("updateDate") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!updateDate) throw new Error("Bitte ein Update-Datum angeben.");

  const supabase = await createClient();

  let resolvedUpdateId = updateId;

  if (resolvedUpdateId) {
    const { error } = await supabase
      .from("performance_updates")
      .update({ update_date: updateDate, reason: reason || null })
      .eq("id", resolvedUpdateId);
    if (error) {
      throw new Error(`Update konnte nicht gespeichert werden: ${error.message}`);
    }
    // Bestehende Noten dieses Updates ersetzen, damit auf leer gesetzte
    // Zellen nicht mit einem alten Wert stehen bleiben.
    await supabase.from("performance_ratings").delete().eq("update_id", resolvedUpdateId);
  } else {
    const { data: update, error: insertError } = await supabase
      .from("performance_updates")
      .insert({ update_date: updateDate, reason: reason || null })
      .select("id")
      .single();
    if (insertError || !update) {
      throw new Error(`Update konnte nicht gespeichert werden: ${insertError?.message}`);
    }
    resolvedUpdateId = update.id;
  }

  const ratingRows = playerIds
    .flatMap((playerId) =>
      focuses.map((focus) => ({
        update_id: resolvedUpdateId!,
        player_id: playerId,
        focus,
        grade: Number(formData.get(`grade_${playerId}_${focus}`) ?? 0),
      })),
    )
    .filter((row) => row.grade >= 1 && row.grade <= 6);

  if (ratingRows.length) {
    const { error } = await supabase.from("performance_ratings").insert(ratingRows);
    if (error) {
      throw new Error(`Bewertungen konnten nicht gespeichert werden: ${error.message}`);
    }
  }

  revalidatePath("/performance/update");
  revalidatePath("/performance/development");
}
