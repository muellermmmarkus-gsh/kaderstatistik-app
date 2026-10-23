"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizeItems } from "./model";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Speichert einen bestehenden Plan oder legt den Plan eines Trainingstermins
 * an (id = null, planDate gesetzt; je Datum nur einmal, daher Upsert).
 */
export async function saveFieldPlan(
  id: string | null,
  name: string,
  items: unknown,
  planDate: string | null = null,
): Promise<{ id?: string; error?: string }> {
  const trimmed = name.trim().slice(0, 100);
  if (!trimmed) return { error: "Bitte einen Namen für den Plan eingeben." };
  if (planDate !== null && !DATE_RE.test(planDate)) return { error: "Ungültiges Datum." };
  // Neue Plaene gibt es nur zu Trainingsterminen.
  if (!id && !planDate) return { error: "Pläne werden über einen Trainingstermin angelegt." };

  const supabase = await createClient();
  // updated_by_team_id: das Team des angemeldeten Trainers.
  const { data: teamId } = await supabase.rpc("current_team_id");
  const values = {
    name: trimmed,
    items: sanitizeItems(items),
    updated_at: new Date().toISOString(),
    updated_by_team_id: teamId,
  };

  const query = id
    ? supabase.from("field_plans").update(values).eq("id", id).select("id").single()
    : supabase
        .from("field_plans")
        .upsert({ ...values, plan_date: planDate }, { onConflict: "plan_date" })
        .select("id")
        .single();

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
