"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";

const ROLES = new Set(["pending", "parent_player", "trainer"]);

export async function setUserRole(userId: string, formData: FormData) {
  const role = String(formData.get("role") ?? "");
  if (!ROLES.has(role)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Eigene Rolle nicht aenderbar, damit sich kein Trainer versehentlich aussperrt.
  if (!user || user.id === userId || !(await isTrainer())) return;

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(`Rolle konnte nicht geändert werden: ${error.message}`);

  revalidatePath("/admin");
}
