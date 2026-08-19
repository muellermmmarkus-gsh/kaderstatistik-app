"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createEvent(formData: FormData) {
  const type = String(formData.get("type") ?? "training");
  const eventDate = String(formData.get("eventDate") ?? "");
  const season = String(formData.get("season") ?? "").trim();
  const opponent = String(formData.get("opponent") ?? "").trim();
  const eventTime = String(formData.get("eventTime") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  if (!eventDate || !season) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      type,
      event_date: eventDate,
      season,
      opponent: type === "game" ? opponent || null : null,
      event_time: type === "game" ? eventTime || null : null,
      location: type === "game" ? location || null : null,
      label: type === "event" ? label || null : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Termin konnte nicht gespeichert werden: ${error.message}`);

  revalidatePath("/events");
  if (data) redirect(`/events/${data.id}?saved=1`);
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", eventId);
  revalidatePath("/events");
}
