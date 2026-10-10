import { cache } from "react";
import { createClient } from "./server";

export type CurrentProfile = {
  role: string;
  isAdmin: boolean;
  teamId: string | null;
  teamName: string | null;
  /** Mannschaftsname im Spielbetrieb (Live-Ergebnis, Spielberichte). */
  teamMatchName: string | null;
  /** BFV-Wettbewerbs-ID fuer das Widget unter "Wettbewerbe". */
  teamBfvCompetitionId: string | null;
  requestedTeam: string | null;
};

// cache(): Navigation und Seite fragen pro Request nur einmal ab.
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_admin, team_id, requested_team, teams(name, match_name, bfv_competition_id)")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  const team = (Array.isArray(profile.teams) ? profile.teams[0] : profile.teams) as
    | { name: string; match_name: string; bfv_competition_id: string | null }
    | null;
  return {
    role: profile.role,
    isAdmin: profile.is_admin,
    teamId: profile.team_id,
    teamName: team?.name ?? null,
    teamMatchName: team?.match_name ?? null,
    teamBfvCompetitionId: team?.bfv_competition_id ?? null,
    requestedTeam: profile.requested_team,
  };
});

export async function getCurrentRole(): Promise<string | null> {
  return (await getCurrentProfile())?.role ?? null;
}

/** Freigegebener Trainer eines Teams. */
export async function isTrainer(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.role === "trainer" && !!profile.teamId;
}

/** Plattform-Admin (gibt Trainer und Teams frei). */
export async function isAdmin(): Promise<boolean> {
  return (await getCurrentProfile())?.isAdmin ?? false;
}
