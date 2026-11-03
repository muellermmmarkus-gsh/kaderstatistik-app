"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function slugify(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "typ";
}

const BUILTIN_KEYS = ["training", "game", "tournament", "event"];

export async function saveEventTypes(formData: FormData) {
  const keys = formData.getAll("key").map(String);
  const labels = formData.getAll("label").map((v) => String(v).trim());
  const trainingFlags = formData.getAll("is_training").map((v) => String(v) === "1");

  const supabase = await createClient();
  const { data: existing } = await supabase.from("event_types").select("key");
  const usedKeys = new Set((existing ?? []).map((e) => e.key));

  const rows = keys
    .map((key, index) => {
      const label = labels[index] ?? "";
      if (!label) return null;

      let finalKey = key;
      if (!finalKey) {
        const base = slugify(label);
        finalKey = base;
        let n = 2;
        while (usedKeys.has(finalKey)) {
          finalKey = `${base}-${n}`;
          n++;
        }
      }
      usedKeys.add(finalKey);
      // Eingebaute Arten behalten ihr Verhalten (nur "training" ist ein Training).
      const isTraining = BUILTIN_KEYS.includes(finalKey)
        ? finalKey === "training"
        : trainingFlags[index] ?? false;
      return { key: finalKey, label, sort_order: index, is_training: isTraining };
    })
    .filter(
      (row): row is { key: string; label: string; sort_order: number; is_training: boolean } => row !== null,
    );

  if (!rows.length) {
    throw new Error("Mindestens eine Terminart wird benötigt.");
  }

  const { error } = await supabase
    .from("event_types")
    .upsert(rows, { onConflict: "key" });
  if (error) {
    throw new Error(`Terminarten konnten nicht gespeichert werden: ${error.message}`);
  }

  // "wie Training" wirkt sich auf viele Seiten aus (Termine, Trainingsplanung, Statistik).
  revalidatePath("/", "layout");
  revalidatePath("/settings/event-types");
  revalidatePath("/events");
  revalidatePath("/calendar");
}

const PROTECTED_KEYS = ["training", "game", "tournament", "event", "unassigned"];

export async function deleteEventType(key: string) {
  if (PROTECTED_KEYS.includes(key)) {
    throw new Error("Diese Terminart kann nicht gelöscht werden.");
  }

  const supabase = await createClient();

  // Betroffene Termine vor dem Loeschen auf "Keine Zuordnung" umstellen, da
  // events.type per Fremdschluessel auf event_types(key) verweist und daher
  // immer auf einen bestehenden Wert zeigen muss.
  const { error: reassignError } = await supabase
    .from("events")
    .update({ type: "unassigned" })
    .eq("type", key);
  if (reassignError) {
    throw new Error(`Termine konnten nicht umgestellt werden: ${reassignError.message}`);
  }

  const { error } = await supabase.from("event_types").delete().eq("key", key);
  if (error) {
    throw new Error(`Terminart konnte nicht gelöscht werden: ${error.message}`);
  }

  revalidatePath("/settings/event-types");
  revalidatePath("/events");
  revalidatePath("/calendar");
}
