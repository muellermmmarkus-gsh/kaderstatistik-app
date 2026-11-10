// Taktikformationen fuer Kleinfeldmannschaften. Die "1" am Anfang steht fuer
// den Torwart, die restlichen Zahlen sind die Reihen von hinten (Abwehr) nach
// vorne (Sturm); ihre Summe ergibt die Zahl der Feldspieler des Spielmodus.
export type Formation = {
  key: string;
  rows: number[];
};

/** Spielmodus = Anzahl Feldspieler (+ Torwart). Spiele laufen immer 6+1. */
export const GAME_MODES = [4, 5, 6] as const;
export type GameMode = (typeof GAME_MODES)[number];
export const DEFAULT_GAME_MODE: GameMode = 6;
export const gameModeLabel = (mode: number) => `${mode}+1`;

const formation = (key: string): Formation => ({
  key,
  rows: key.split("-").slice(1).map(Number),
});

export const FORMATIONS_BY_MODE: Record<GameMode, Formation[]> = {
  4: ["1-2-2", "1-1-2-1", "1-2-1-1", "1-3-1", "1-1-3"].map(formation),
  5: ["1-2-2-1", "1-3-1-1", "1-2-1-2", "1-1-3-1", "1-3-2", "1-2-3"].map(formation),
  6: ["1-3-2-1", "1-2-3-1", "1-3-1-2", "1-1-3-2", "1-2-2-2", "1-4-1-1"].map(formation),
};

/** Alle Formationen aller Spielmodi (Keys sind eindeutig, die Summe ergibt den Modus). */
export const FORMATIONS: Formation[] = GAME_MODES.flatMap((m) => FORMATIONS_BY_MODE[m]);

export const isGameMode = (value: number): value is GameMode =>
  (GAME_MODES as readonly number[]).includes(value);

export type Slot = {
  key: string;
  label: string;
  x: number;
  y: number;
};

function rowX(count: number): number[] {
  switch (count) {
    case 1:
      return [50];
    case 2:
      return [30, 70];
    case 3:
      return [18, 50, 82];
    case 4:
      return [12, 38, 62, 88];
    default:
      return Array.from({ length: count }, (_, i) => (100 / (count + 1)) * (i + 1));
  }
}

// Slot-Keys: erste Reihe "def", letzte "fwd", dazwischen "mid", "mid2", ...
// (bei drei Reihen wie bisher def/mid/fwd, damit gespeicherte Aufstellungen passen).
function rowKey(index: number, total: number): { key: string; label: string } {
  if (index === 0) return { key: "def", label: "Abwehr" };
  if (index === total - 1) return { key: "fwd", label: "Sturm" };
  return { key: index === 1 ? "mid" : `mid${index}`, label: "Mittelfeld" };
}

// Aufstellung von unten (eigenes Tor) nach oben (Angriffsrichtung), analog
// zu einer klassischen Taktiktafel.
export function getSlots(f: Formation): Slot[] {
  const slots: Slot[] = [{ key: "gk", label: "TW", x: 50, y: 90 }];
  const n = f.rows.length;
  f.rows.forEach((count, rowIndex) => {
    const y = n === 1 ? 45 : 68 - ((68 - 18) * rowIndex) / (n - 1);
    const { key, label } = rowKey(rowIndex, n);
    rowX(count).forEach((x, i) => slots.push({ key: `${key}-${i}`, label, x, y }));
  });
  return slots;
}

export function getFormation(key: string, mode?: number): Formation {
  const list = mode && isGameMode(mode) ? FORMATIONS_BY_MODE[mode] : FORMATIONS;
  return list.find((f) => f.key === key) ?? (mode ? list[0] : FORMATIONS_BY_MODE[DEFAULT_GAME_MODE][0]);
}
