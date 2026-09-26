// Name der eigenen Mannschaft (siehe supabase/insert_spielplan_313103.sql).
export const OWN_TEAM = "TV Geisenhausen E7 1";

export type TeamSide = "a" | "b";
export type GoalKind = "goal" | "own_goal";

export type GoalEntry = {
  id: string;
  minute: string;
  team: TeamSide;
  kind: GoalKind;
  shirtNumber: number | null;
  /** Torschuetze der eigenen Mannschaft (null bei Gegner/ohne Zuordnung). */
  playerId: string | null;
  note: string;
};

/** Auf welcher Seite (a = zuerst genannt) die eigene Mannschaft steht. */
export function ownSideOf(teamA: string): TeamSide {
  return teamA === OWN_TEAM ? "a" : "b";
}

/**
 * Leitet die beiden Mannschaften aus dem Gegner-Feld eines Spieltermins ab.
 * Der Spielplan-Import schreibt "(heim)" bzw. "(auswärts)" an den Gegner -
 * die Heimmannschaft wird zuerst genannt. Ohne Zusatz gilt das Spiel als
 * Heimspiel.
 */
export function teamsForEvent(opponent: string | null): [string, string] {
  const raw = (opponent ?? "").trim();
  const match = raw.match(/^(.*?)\s*\((heim|auswärts|auswaerts)\)\s*$/i);
  const name = (match ? match[1] : raw) || "Gegner";
  const isAway = !!match && match[2].toLowerCase() !== "heim";
  return isAway ? [name, OWN_TEAM] : [OWN_TEAM, name];
}

/** Spielstand: ein Eigentor eines Spielers zaehlt fuer die andere Mannschaft. */
export function scoreOf(entries: { team: TeamSide; kind: GoalKind }[]): [number, number] {
  let a = 0;
  let b = 0;
  for (const entry of entries) {
    const scoringSide = entry.kind === "goal" ? entry.team : entry.team === "a" ? "b" : "a";
    if (scoringSide === "a") a++;
    else b++;
  }
  return [a, b];
}

/** Heutiges Datum (YYYY-MM-DD) in deutscher Zeit, unabhaengig von der Server-Zeitzone. */
export function todayInGermany(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
}
