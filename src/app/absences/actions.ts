"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function readAbsenceFields(formData: FormData) {
  const reason = String(formData.get("reason") ?? "Abwesenheit").trim() || "Abwesenheit";
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  return { reason, startDate, endDate };
}

export async function addAbsence(trainerId: string, formData: FormData) {
  const { reason, startDate, endDate } = readAbsenceFields(formData);
  if (!startDate || !endDate) return;

  const supabase = await createClient();
  await supabase.from("trainer_absences").insert({
    trainer_id: trainerId,
    reason,
    start_date: startDate,
    end_date: endDate,
  });

  revalidatePath("/absences");
  revalidatePath("/calendar");
}

export async function updateAbsence(absenceId: string, formData: FormData) {
  const { reason, startDate, endDate } = readAbsenceFields(formData);
  if (!startDate || !endDate) return;

  const supabase = await createClient();
  await supabase
    .from("trainer_absences")
    .update({ reason, start_date: startDate, end_date: endDate })
    .eq("id", absenceId);

  revalidatePath("/absences");
  revalidatePath("/calendar");
}

export async function deleteAbsence(absenceId: string) {
  const supabase = await createClient();
  await supabase.from("trainer_absences").delete().eq("id", absenceId);

  revalidatePath("/absences");
  revalidatePath("/calendar");
}
