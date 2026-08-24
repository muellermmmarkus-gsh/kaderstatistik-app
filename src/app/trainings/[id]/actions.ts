"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveTrainingPlan(eventId: string, formData: FormData) {
  const focus = String(formData.get("focus") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const afterSaveRedirect = String(formData.get("afterSaveRedirect") ?? "").trim();
  const exerciseIds = formData.getAll("exercise_id").map(String);
  const durations = formData.getAll("duration_minutes").map(String);
  const blocks = formData.getAll("block").map(String);
  const groupsPerRow = formData.getAll("groups").map(String);
  const playerIds = formData.getAll("player_id").map(String);
  const playerGroupLabels = formData.getAll("player_group").map(String);

  const supabase = await createClient();

  const { data: training, error: upsertError } = await supabase
    .from("trainings")
    .upsert(
      { event_id: eventId, focus: focus || null, notes: notes || null },
      { onConflict: "event_id" },
    )
    .select("id")
    .single();
  if (upsertError) throw new Error(`Trainingsplan konnte nicht gespeichert werden: ${upsertError.message}`);
  if (!training) return;

  const filteredRows = exerciseIds
    .map((exerciseId, index) => ({
      exercise_id: exerciseId,
      duration_minutes: Number(durations[index] ?? 0),
      block: Number(blocks[index] ?? 1),
      groups: (groupsPerRow[index] ?? "")
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
    }))
    .filter((row) => row.exercise_id && row.duration_minutes > 0);

  // Trainingsbloecke beim Speichern luecken- und kollisionsfrei aufsteigend von 1
  // bis x durchnummerieren. So kann eine neu hinzugefuegte Uebung einfach per
  // Blocknummer vor bestehende Bloecke einsortiert werden, ohne dass der Nutzer
  // alle nachfolgenden Bloecke manuell hochzaehlen muss. Zeilen mit derselben
  // (urspruenglichen) Blocknummer bleiben als paralleles Zeitfenster zusammen.
  const sortedDistinctBlocks = [...new Set(filteredRows.map((row) => row.block))].sort(
    (a, b) => a - b,
  );
  const blockRenumberMap = new Map(sortedDistinctBlocks.map((block, index) => [block, index + 1]));

  const rows = filteredRows.map((row, index) => ({
    ...row,
    block: blockRenumberMap.get(row.block) ?? row.block,
    // sort_order erst nach dem Filtern vergeben, sonst entstehen Luecken,
    // sobald eine Zeile ohne gewaehlte Uebung uebersprungen wird.
    sort_order: index,
  }));

  // Bestehenden Plan ersetzen, damit entfernte Uebungen nicht stehen bleiben.
  await supabase.from("training_exercises").delete().eq("training_id", training.id);
  if (rows.length) {
    const { data: inserted, error } = await supabase
      .from("training_exercises")
      .insert(
        rows.map((row) => ({
          training_id: training.id,
          exercise_id: row.exercise_id,
          sort_order: row.sort_order,
          duration_minutes: row.duration_minutes,
          block: row.block,
        })),
      )
      .select("id, sort_order");
    if (error) throw new Error(`Übungen konnten nicht gespeichert werden: ${error.message}`);

    const idBySortOrder = new Map((inserted ?? []).map((r) => [r.sort_order, r.id]));
    const groupRows = rows.flatMap((row) => {
      const trainingExerciseId = idBySortOrder.get(row.sort_order);
      if (!trainingExerciseId) return [];
      return row.groups.map((group_label) => ({
        training_exercise_id: trainingExerciseId,
        group_label,
      }));
    });
    if (groupRows.length) {
      const { error: groupError } = await supabase
        .from("training_exercise_groups")
        .insert(groupRows);
      if (groupError) {
        throw new Error(`Gruppen konnten nicht gespeichert werden: ${groupError.message}`);
      }
    }
  }

  const playerGroupRows = playerIds
    .map((playerId, index) => ({
      training_id: training.id,
      player_id: playerId,
      group_label: playerGroupLabels[index] ?? "",
    }))
    .filter((row) => row.player_id && row.group_label);

  await supabase.from("training_player_groups").delete().eq("training_id", training.id);
  if (playerGroupRows.length) {
    const { error: playerGroupError } = await supabase
      .from("training_player_groups")
      .insert(playerGroupRows);
    if (playerGroupError) {
      throw new Error(`Spielergruppen konnten nicht gespeichert werden: ${playerGroupError.message}`);
    }
  }

  revalidatePath(`/trainings/${eventId}`);
  revalidatePath("/trainings");

  if (afterSaveRedirect) redirect(afterSaveRedirect);
}
