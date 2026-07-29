"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createEvent(formData: FormData) {
  const type = String(formData.get("type") ?? "training");
  const eventDate = String(formData.get("eventDate") ?? "");
  const season = String(formData.get("season") ?? "").trim();
  const opponent = String(formData.get("opponent") ?? "").trim();

  if (!eventDate || !season) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .insert({
      type,
      event_date: eventDate,
      season,
      opponent: type === "game" ? opponent || null : null,
    })
    .select("id")
    .single();

  revalidatePath("/events");
  if (data) redirect(`/events/${data.id}`);
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", eventId);
  revalidatePath("/events");
}
