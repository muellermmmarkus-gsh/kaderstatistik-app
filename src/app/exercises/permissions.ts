import type { CurrentProfile } from "@/lib/supabase/profile";

/**
 * Aendern/Loeschen einer Uebung: der Admin alle, Trainer nur Uebungen ihres
 * eigenen Teams (Erstellerteam). Entspricht der RLS in migration_035.
 */
export function canEditExercise(
  profile: CurrentProfile | null,
  createdByTeamId: string | null,
): boolean {
  if (!profile) return false;
  if (profile.isAdmin) return true;
  return profile.role === "trainer" && !!profile.teamId && createdByTeamId === profile.teamId;
}
