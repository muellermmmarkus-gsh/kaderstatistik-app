// Grossfeld fuer Erwachsene in Metern (FIFA-Standardmass).
export const PITCH_LENGTH = 105;
export const PITCH_WIDTH = 68;

// Kleinfeld E-Jugend (7 gegen 7) nach DFB-Empfehlung: 55 x 35 m,
// Strafraum 21 m breit und 8 m tief, Strafstossmarke 8 m, Tore 5 x 2 m.
export const FIELD_E = { length: 55, width: 35, boxWidth: 21, boxDepth: 8, penaltySpot: 8 };

export type AreaKind = "half" | "third" | "quarter" | "field_e";
export type GoalKind = "goal_big" | "goal_small" | "goal_mini";
export type ItemKind = AreaKind | GoalKind;

export type FieldItem = {
  id: string;
  kind: ItemKind;
  /** Flaechen: linke obere Ecke; Tore: Mittelpunkt (Meter). */
  x: number;
  y: number;
  /** Flaechen: 0 oder 90 (Ausrichtung); Tore: 0/90/180/270 (Oeffnung). */
  rotation: number;
  /** Mannschaft (nur Flaechen). */
  label?: string;
  color?: string;
  /** Vom Standard abweichende Groesse (nur Flaechen, per Rechtsklick freigeschaltet). */
  custom?: boolean;
  w?: number;
  h?: number;
  /** Zeitabschnitt (Index in SEGMENTS), nur wenn das Training aufgeteilt ist. */
  segment?: number;
};

/** Optionale Aufteilung eines Trainings in drei Zeitabschnitte. */
export const SEGMENTS = ["0.–30. Min", "30.–60. Min", "60.–90. Min"];

/** Ein Plan ist aufgeteilt, sobald seine Elemente einen Zeitabschnitt tragen. */
export const isSplit = (items: FieldItem[]) => items.some((i) => i.segment !== undefined);

export const AREA_COLORS = ["#2563eb", "#dc2626", "#d97706", "#7c3aed", "#0891b2", "#db2777"];

export const KIND_LABELS: Record<ItemKind, string> = {
  half: "1/2-Fläche",
  third: "1/3-Fläche",
  quarter: "1/4-Fläche",
  field_e: "Kleinfeld E-Jugend",
  goal_big: "Großfeldtor",
  goal_small: "Kleinfeldtor",
  goal_mini: "Mini-Tor",
};

// Torbreite (an der Linie) x Tiefe in Metern.
export const GOAL_SIZES: Record<GoalKind, { width: number; depth: number }> = {
  goal_big: { width: 7.32, depth: 2 },
  goal_small: { width: 5, depth: 2 },
  goal_mini: { width: 1.2, depth: 0.8 },
};

const AREA_KINDS: AreaKind[] = ["half", "third", "quarter", "field_e"];
export const isArea = (kind: ItemKind): kind is AreaKind => AREA_KINDS.includes(kind as AreaKind);

/** Standardgroesse einer Flaeche je nach Ausrichtung. */
export function standardAreaSize(kind: AreaKind, rotation: number) {
  const across = rotation === 90;
  switch (kind) {
    case "half":
      return across ? { w: PITCH_LENGTH, h: PITCH_WIDTH / 2 } : { w: PITCH_LENGTH / 2, h: PITCH_WIDTH };
    case "third":
      return across ? { w: PITCH_LENGTH, h: PITCH_WIDTH / 3 } : { w: PITCH_LENGTH / 3, h: PITCH_WIDTH };
    case "quarter":
      return across ? { w: PITCH_LENGTH / 4, h: PITCH_WIDTH } : { w: PITCH_LENGTH / 2, h: PITCH_WIDTH / 2 };
    case "field_e":
      return across ? { w: FIELD_E.width, h: FIELD_E.length } : { w: FIELD_E.length, h: FIELD_E.width };
  }
}

/** Tatsaechliche Groesse einer Flaeche (angepasst oder Standard). */
export function areaSize(item: FieldItem) {
  if (item.custom && item.w && item.h) return { w: item.w, h: item.h };
  return standardAreaSize(item.kind as AreaKind, item.rotation);
}

export const MIN_AREA = 3;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const roundTo = (v: number, step: number) => Math.round(v / step) * step;

/**
 * 1/2-, 1/3- und 1/4-Flaechen rasten auf die passenden Platzpositionen ein,
 * Kleinfelder und angepasste Flaechen auf einen halben Meter.
 */
export function snapArea(item: FieldItem): FieldItem {
  if (!isArea(item.kind)) return item;
  const { w, h } = areaSize(item);
  const free = item.custom || item.kind === "field_e";
  return {
    ...item,
    x: clamp(free ? roundTo(item.x, 0.5) : Math.round(item.x / w) * w, 0, Math.max(0, PITCH_LENGTH - w)),
    y: clamp(free ? roundTo(item.y, 0.5) : Math.round(item.y / h) * h, 0, Math.max(0, PITCH_WIDTH - h)),
  };
}

/** Schaltet die freie Groesse ein (aktuelle Groesse uebernehmen) oder zurueck auf Standard. */
export function setCustom(item: FieldItem, custom: boolean): FieldItem {
  if (custom) {
    const { w, h } = areaSize(item);
    return { ...item, custom: true, w, h };
  }
  const { w, h } = standardAreaSize(item.kind as AreaKind, item.rotation);
  const current = areaSize(item);
  // Um den Mittelpunkt auf die Standardgroesse zuruecksetzen.
  return snapArea({
    ...item,
    custom: false,
    w: undefined,
    h: undefined,
    x: item.x + current.w / 2 - w / 2,
    y: item.y + current.h / 2 - h / 2,
  });
}

const KINDS: ItemKind[] = [...AREA_KINDS, "goal_big", "goal_small", "goal_mini"];
const MAX_ITEMS = 200;

/** Prueft und bereinigt Elemente aus dem Client, bevor sie gespeichert werden. */
export function sanitizeItems(input: unknown): FieldItem[] {
  if (!Array.isArray(input)) return [];
  const list = input.slice(0, MAX_ITEMS * SEGMENTS.length);
  // Aufgeteilt: alle Elemente brauchen einen Abschnitt (fehlend = erster Abschnitt).
  const split = list.some((raw) => raw && typeof raw === "object" && (raw as { segment?: unknown }).segment != null);
  return list.flatMap((raw): FieldItem[] => {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as Record<string, unknown>;
    const kind = r.kind as ItemKind;
    if (!KINDS.includes(kind)) return [];
    const x = Number(r.x);
    const y = Number(r.y);
    const rotation = Number(r.rotation);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
    const item: FieldItem = {
      id: typeof r.id === "string" && r.id.length <= 64 ? r.id : crypto.randomUUID(),
      kind,
      x: clamp(x, -10, PITCH_LENGTH + 10),
      y: clamp(y, -10, PITCH_WIDTH + 10),
      rotation: isArea(kind)
        ? rotation === 90 ? 90 : 0
        : [0, 90, 180, 270].includes(rotation) ? rotation : 0,
    };
    if (split) {
      const segment = Number((r as { segment?: unknown }).segment);
      item.segment = Number.isInteger(segment) && segment >= 0 && segment < SEGMENTS.length ? segment : 0;
    }
    if (isArea(kind)) {
      item.label = typeof r.label === "string" ? r.label.slice(0, 40) : "";
      item.color = AREA_COLORS.includes(r.color as string) ? (r.color as string) : AREA_COLORS[0];
      const w = Number(r.w);
      const h = Number(r.h);
      if (r.custom === true && Number.isFinite(w) && Number.isFinite(h)) {
        item.custom = true;
        item.w = clamp(w, MIN_AREA, PITCH_LENGTH);
        item.h = clamp(h, MIN_AREA, PITCH_LENGTH);
      }
    }
    return [item];
  });
}
