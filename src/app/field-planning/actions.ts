"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizeItems } from "./model";

/** Legt einen Plan an (id = null) oder speichert einen bestehenden. */
export async function saveFieldPlan(
  id: string | null,
  name: string,
  items: unknown,
): Promise<{ id?: string; error?: string }> {
  const trimmed = name.trim().slice(0, 100);
  if (!trimmed) return { error: "Bitte einen Namen für den Plan eingeben." };

  const values = {
    name: trimmed,
    items: sanitizeItems(items),
    updated_at: new Date().toISOString(),
  };
  const supabase = await createClient();
  // updated_by_team_id: beim Anlegen per Default, beim Speichern explizit
  // das Team des angemeldeten Trainers.
  const { data: teamId } = await supabase.rpc("current_team_id");

  const query = id
    ? supabase
        .from("field_plans")
        .update({ ...values, updated_by_team_id: teamId })
        .eq("id", id)
        .select("id")
        .single()
    : supabase.from("field_plans").insert(values).select("id").single();

  const { data, error } = await query;
  if (error) return { error: `Plan konnte nicht gespeichert werden: ${error.message}` };

  revalidatePath("/field-planning");
  return { id: data.id };
}

export async function deleteFieldPlan(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("field_plans").delete().eq("id", id);
  if (error) return { error: `Plan konnte nicht gelöscht werden: ${error.message}` };
  revalidatePath("/field-planning");
  return {};
}
