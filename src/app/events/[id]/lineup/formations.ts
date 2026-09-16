// Taktikformationen fuer 6+1-Kleinfeldmannschaften (6 Feldspieler + Torwart).
// Die "1" am Anfang steht fuer den Torwart, die Summe der restlichen drei
// Zahlen (Abwehr-Mittelfeld-Sturm) ergibt immer 6 Feldspieler.
export type Formation = {
  key: string;
  defense: number;
  midfield: number;
  forward: number;
};

export const FORMATIONS: Formation[] = [
  { key: "1-3-2-1", defense: 3, midfield: 2, forward: 1 },
  { key: "1-2-3-1", defense: 2, midfield: 3, forward: 1 },
  { key: "1-3-1-2", defense: 3, midfield: 1, forward: 2 },
  { key: "1-1-3-2", defense: 1, midfield: 3, forward: 2 },
  { key: "1-2-2-2", defense: 2, midfield: 2, forward: 2 },
  { key: "1-4-1-1", defense: 4, midfield: 1, forward: 1 },
];

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

// Aufstellung von unten (eigenes Tor) nach oben (Angriffsrichtung), analog
// zu einer klassischen Taktiktafel.
export function getSlots(formation: Formation): Slot[] {
  const slots: Slot[] = [{ key: "gk", label: "TW", x: 50, y: 90 }];
  rowX(formation.defense).forEach((x, i) => {
    slots.push({ key: `def-${i}`, label: `Abwehr`, x, y: 68 });
  });
  rowX(formation.midfield).forEach((x, i) => {
    slots.push({ key: `mid-${i}`, label: `Mittelfeld`, x, y: 45 });
  });
  rowX(formation.forward).forEach((x, i) => {
    slots.push({ key: `fwd-${i}`, label: `Sturm`, x, y: 18 });
  });
  return slots;
}

export function getFormation(key: string): Formation {
  return FORMATIONS.find((f) => f.key === key) ?? FORMATIONS[0];
}
