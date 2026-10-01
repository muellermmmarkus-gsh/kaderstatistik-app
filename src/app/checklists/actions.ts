"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MAX_NOTE_LENGTH = 200;

export async function createChecklist(_prevState: string | null, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return "Bitte einen Namen eingeben.";

  const supabase = await createClient();
  const { data: checklist, error } = await supabase
    .from("checklists")
    .insert({ name })
    .select("id")
    .single();
  if (error) return `Checkliste konnte nicht angelegt werden: ${error.message}`;

  const [{ data: players }, { data: trainers }] = await Promise.all([
    supabase.from("players").select("id").eq("active", true),
    supabase.from("trainers").select("id").eq("active", true),
  ]);
  const items = [
    ...(players ?? []).map((p) => ({ checklist_id: checklist.id, player_id: p.id })),
    ...(trainers ?? []).map((t) => ({ checklist_id: checklist.id, trainer_id: t.id })),
  ];
  if (items.length) {
    const { error: itemsError } = await supabase.from("checklist_items").insert(items);
    if (itemsError) {
      await supabase.from("checklists").delete().eq("id", checklist.id);
      return `Checkliste konnte nicht angelegt werden: ${itemsError.message}`;
    }
  }

  revalidatePath("/checklists");
  redirect(`/checklists/${checklist.id}`);
}

export async function renameChecklist(checklistId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "Der Name darf nicht leer sein.";

  const supabase = await createClient();
  const { error } = await supabase.from("checklists").update({ name: trimmed }).eq("id", checklistId);
  if (error) return `Name konnte nicht gespeichert werden: ${error.message}`;

  revalidatePath("/checklists");
  revalidatePath(`/checklists/${checklistId}`);
  return null;
}

export async function updateChecklistItem(
  checklistId: string,
  itemId: string,
  fields: { done?: boolean; note?: string },
) {
  const update: { done?: boolean; note?: string | null } = {};
  if (fields.done !== undefined) update.done = fields.done;
  if (fields.note !== undefined) update.note = fields.note.trim().slice(0, MAX_NOTE_LENGTH) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").update(update).eq("id", itemId);
  if (error) return `Änderung konnte nicht gespeichert werden: ${error.message}`;

  revalidatePath("/checklists");
  revalidatePath(`/checklists/${checklistId}`);
  return null;
}
