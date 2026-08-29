"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deletePerformanceUpdate(updateId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("performance_updates")
    .delete()
    .eq("id", updateId);
  if (error) {
    throw new Error(`Update konnte nicht gelöscht werden: ${error.message}`);
  }

  revalidatePath("/performance/development");
  revalidatePath("/performance/update");
}
