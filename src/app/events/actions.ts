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

  const hasOpponentFields = type === "game" || type === "tournament";
  // Terminarten ohne eigene Sonderfelder (also nicht Training/Spiel/Turnier)
  // verhalten sich wie "Event": nur eine Bezeichnung - gilt automatisch auch
  // fuer neu unter Einstellungen angelegte Terminarten.
  const needsLabel = type !== "training" && !hasOpponentFields;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      type,
      event_date: eventDate,
      season,
      opponent: hasOpponentFields ? opponent || null : null,
      event_time: hasOpponentFields ? eventTime || null : null,
      location: hasOpponentFields ? location || null : null,
      label: needsLabel ? label || null : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Termin konnte nicht gespeichert werden: ${error.message}`);

  revalidatePath("/events");
  if (data) redirect(`/events/${data.id}?saved=1`);
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("type, event_date")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return;

  // Vergangene Trainingstermine (inkl. heute) duerfen nicht geloescht werden,
  // damit Trainingsplaene und bereits erfasste Anwesenheiten erhalten
  // bleiben. Spiele/Events/Turniere sind davon nicht betroffen.
  const today = new Date().toISOString().slice(0, 10);
  if (event.type === "training" && event.event_date <= today) {
    throw new Error("Vergangene Trainingstermine können nicht gelöscht werden.");
  }

  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw new Error(`Termin konnte nicht gelöscht werden: ${error.message}`);

  revalidatePath("/events");
  revalidatePath("/trainings");
}
