import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export const SHIRT_NUMBER_MAX = 100;

/**
 * Rueckennummern (player_id -> Nummer) fuer einen Spieltermin.
 *
 * Sind im Spiel selbst noch keine Nummern gespeichert, gelten die Nummern
 * aus dem letzten vorherigen Spiel als Voreinstellung (isPreset = true) -
 * so muessen die Nummern nicht vor jedem Spiel neu vergeben werden.
 */
export async function getShirtNumbers(
  supabase: SupabaseClient,
  eventId: string,
  eventDate: string,
): Promise<{ numbers: Map<string, number>; isPreset: boolean }> {
  const { data: own } = await supabase
    .from("attendance")
    .select("player_id, shirt_number")
    .eq("event_id", eventId)
    .not("shirt_number", "is", null);
  if (own?.length) {
    return {
      numbers: new Map(own.map((r) => [r.player_id as string, r.shirt_number as number])),
      isPreset: false,
    };
  }

  const { data: previous } = await supabase
    .from("attendance")
    .select("player_id, shirt_number, event_id, events!inner(event_date, type, deleted_at)")
    .not("shirt_number", "is", null)
    .eq("events.type", "game")
    .is("events.deleted_at", null)
    .lt("events.event_date", eventDate);

  type Row = {
    player_id: string;
    shirt_number: number;
    event_id: string;
    events: { event_date: string };
  };
  const rows = (previous as unknown as Row[] | null) ?? [];
  if (!rows.length) return { numbers: new Map(), isPreset: false };

  // Nur das letzte vorherige Spiel verwenden, nicht Nummern aus
  // verschiedenen Spielen mischen.
  const latest = rows.reduce((best, r) =>
    r.events.event_date > best.events.event_date ? r : best,
  );
  return {
    numbers: new Map(
      rows
        .filter((r) => r.event_id === latest.event_id)
        .map((r) => [r.player_id, r.shirt_number]),
    ),
    isPreset: true,
  };
}
