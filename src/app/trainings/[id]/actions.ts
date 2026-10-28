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
  // Freitext-Anpassungen je Zeile; leer = Wert aus der Uebung.
  const fieldTexts = formData.getAll("field_text").map(String);
  const smallGoalsTexts = formData.getAll("small_goals_text").map(String);
  const miniGoalsTexts = formData.getAll("mini_goals_text").map(String);
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
      field_text: (fieldTexts[index] ?? "").trim().slice(0, 100) || null,
      small_goals_text: (smallGoalsTexts[index] ?? "").trim().slice(0, 50) || null,
      mini_goals_text: (miniGoalsTexts[index] ?? "").trim().slice(0, 50) || null,
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
          field_text: row.field_text,
          small_goals_text: row.small_goals_text,
          mini_goals_text: row.mini_goals_text,
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

type SourceExercise = {
  exercise_id: string;
  sort_order: number;
  duration_minutes: number;
  block: number;
  field_text: string | null;
  small_goals_text: string | null;
  mini_goals_text: string | null;
  training_exercise_groups: { group_label: string }[];
};

/**
 * Kopiert den gespeicherten Trainingsplan (Schwerpunkt, Notizen, Uebungen inkl.
 * Bloecke, Gruppen und Freitexte, Spielergruppen) auf einen anderen
 * Trainingstermin. Der bisherige Inhalt des Zieltermins wird ersetzt.
 */
export async function copyTrainingPlan(
  sourceEventId: string,
  targetEventId: string,
): Promise<{ error?: string }> {
  if (sourceEventId === targetEventId) return { error: "Quell- und Zieltermin sind identisch." };
  const supabase = await createClient();

  const [{ data: source }, { data: target }] = await Promise.all([
    supabase
      .from("trainings")
      .select(
        "focus, notes, training_exercises(exercise_id, sort_order, duration_minutes, block, field_text, small_goals_text, mini_goals_text, training_exercise_groups(group_label)), training_player_groups(player_id, group_label)",
      )
      .eq("event_id", sourceEventId)
      .maybeSingle(),
    // Ueber RLS nur Trainingstermine des eigenen Teams.
    supabase
      .from("events")
      .select("id")
      .eq("id", targetEventId)
      .eq("type", "training")
      .is("deleted_at", null)
      .maybeSingle(),
  ]);
  if (!source) return { error: "Für diesen Termin ist noch kein Trainingsplan gespeichert." };
  if (!target) return { error: "Der Zieltermin wurde nicht gefunden." };

  const { data: training, error: upsertError } = await supabase
    .from("trainings")
    .upsert(
      { event_id: targetEventId, focus: source.focus, notes: source.notes },
      { onConflict: "event_id" },
    )
    .select("id")
    .single();
  if (upsertError || !training) {
    return { error: `Trainingsplan konnte nicht kopiert werden: ${upsertError?.message ?? "unbekannter Fehler"}` };
  }

  // Vorhandene Inhalte im Zieltermin ersetzen (Gruppen haengen per cascade dran).
  await supabase.from("training_exercises").delete().eq("training_id", training.id);
  await supabase.from("training_player_groups").delete().eq("training_id", training.id);

  const exercises = ((source.training_exercises ?? []) as SourceExercise[])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  if (exercises.length) {
    const { data: inserted, error } = await supabase
      .from("training_exercises")
      .insert(
        exercises.map((e) => ({
          training_id: training.id,
          exercise_id: e.exercise_id,
          sort_order: e.sort_order,
          duration_minutes: e.duration_minutes,
          block: e.block,
          field_text: e.field_text,
          small_goals_text: e.small_goals_text,
          mini_goals_text: e.mini_goals_text,
        })),
      )
      .select("id, sort_order");
    if (error) return { error: `Übungen konnten nicht kopiert werden: ${error.message}` };

    const idBySortOrder = new Map((inserted ?? []).map((r) => [r.sort_order, r.id]));
    const groupRows = exercises.flatMap((e) => {
      const trainingExerciseId = idBySortOrder.get(e.sort_order);
      if (!trainingExerciseId) return [];
      return (e.training_exercise_groups ?? []).map((g) => ({
        training_exercise_id: trainingExerciseId,
        group_label: g.group_label,
      }));
    });
    if (groupRows.length) {
      const { error: groupError } = await supabase.from("training_exercise_groups").insert(groupRows);
      if (groupError) return { error: `Gruppen konnten nicht kopiert werden: ${groupError.message}` };
    }
  }

  const playerGroups = (source.training_player_groups ?? []) as { player_id: string; group_label: string }[];
  if (playerGroups.length) {
    const { error: playerGroupError } = await supabase.from("training_player_groups").insert(
      playerGroups.map((pg) => ({
        training_id: training.id,
        player_id: pg.player_id,
        group_label: pg.group_label,
      })),
    );
    if (playerGroupError) {
      return { error: `Spielergruppen konnten nicht kopiert werden: ${playerGroupError.message}` };
    }
  }

  revalidatePath(`/trainings/${targetEventId}`);
  revalidatePath("/trainings");
  return {};
}
