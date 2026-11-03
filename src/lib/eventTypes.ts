import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Fallback, falls die Tabelle event_types (noch) nicht lesbar ist.
const BUILTIN_LABELS: Record<string, string> = {
  training: "Training",
  game: "Spiel",
  tournament: "Turnier",
  event: "Event",
};

/**
 * Bezeichnungen aller Terminarten (key -> label) aus "Einstellungen -> Termine".
 * Immer hierueber anzeigen statt Bezeichnungen fest im Code zu hinterlegen,
 * damit auch selbst angelegte Terminarten (z.B. "Hallentraining") richtig heissen.
 */
export async function loadEventTypeLabels(supabase: SupabaseClient): Promise<Map<string, string>> {
  const { data } = await supabase.from("event_types").select("key, label");
  return new Map((data ?? []).map((t) => [t.key as string, t.label as string]));
}

export function eventTypeLabel(labels: Map<string, string>, type: string): string {
  return labels.get(type) ?? BUILTIN_LABELS[type] ?? type;
}

/**
 * Keys aller Terminarten, die sich wie ein Training verhalten ("training" und
 * eigene Arten mit Haken "wie Training", z.B. Hallentraining). Statt
 * `type === "training"` immer hierueber pruefen bzw. filtern.
 */
export async function loadTrainingTypeKeys(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.from("event_types").select("key").eq("is_training", true);
  // Vor migration_044 gibt es die Spalte noch nicht: nur das eingebaute Training.
  if (error || !data?.length) return ["training"];
  const keys = data.map((t) => t.key as string);
  return keys.includes("training") ? keys : ["training", ...keys];
}
