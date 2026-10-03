// Den Namen der eigenen Mannschaft im Spielbetrieb liefert teams.match_name
// des angemeldeten Teams (getCurrentProfile().teamMatchName).

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
export function ownSideOf(teamA: string, ownTeam: string): TeamSide {
  return teamA === ownTeam ? "a" : "b";
}

/**
 * Leitet die beiden Mannschaften aus dem Gegner-Feld eines Spieltermins ab.
 * Der Spielplan-Import schreibt "(heim)" bzw. "(auswärts)" an den Gegner -
 * die Heimmannschaft wird zuerst genannt. Ohne Zusatz gilt das Spiel als
 * Heimspiel.
 */
export function teamsForEvent(opponent: string | null, ownTeam: string): [string, string] {
  const raw = (opponent ?? "").trim();
  const match = raw.match(/^(.*?)\s*\((heim|auswärts|auswaerts)\)\s*$/i);
  const name = (match ? match[1] : raw) || "Gegner";
  const isAway = !!match && match[2].toLowerCase() !== "heim";
  return isAway ? [name, ownTeam] : [ownTeam, name];
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

/** Sortierschluessel Spielminute: "12" -> 12, "45+2" -> 45.02, ohne Minute ans Ende. */
export function minuteKey(minute: string | null | undefined): number {
  const match = (minute ?? "").match(/^\s*(\d+)(?:\s*\+\s*(\d+))?/);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]) + Number(match[2] ?? 0) / 100;
}

/**
 * Chronologisch nach Spielminute (1. Minute zuerst). Die Sortierung ist
 * stabil: Eintraege mit gleicher/ohne Minute behalten die Reihenfolge der
 * Eingabeliste (= Erfassungsreihenfolge, wenn so uebergeben).
 */
export function sortByMinute<T extends { minute: string | null }>(entries: T[]): T[] {
  return [...entries].sort((x, y) => {
    const diff = minuteKey(x.minute) - minuteKey(y.minute);
    return Number.isNaN(diff) ? 0 : diff;
  });
}

/** Heutiges Datum (YYYY-MM-DD) in deutscher Zeit, unabhaengig von der Server-Zeitzone. */
export function todayInGermany(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
}
