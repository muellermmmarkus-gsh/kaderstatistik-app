// Grossfeld fuer Erwachsene in Metern (FIFA-Standardmass).
export const PITCH_LENGTH = 105;
export const PITCH_WIDTH = 68;

export type AreaKind = "half" | "quarter";
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
};

export const AREA_COLORS = ["#2563eb", "#dc2626", "#d97706", "#7c3aed", "#0891b2", "#db2777"];

export const KIND_LABELS: Record<ItemKind, string> = {
  half: "1/2-Fläche",
  quarter: "1/4-Fläche",
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

export const isArea = (kind: ItemKind): kind is AreaKind => kind === "half" || kind === "quarter";

/** Groesse einer Flaeche je nach Ausrichtung (halbes bzw. viertel Feld). */
export function areaSize(kind: AreaKind, rotation: number) {
  const across = rotation === 90;
  if (kind === "half") {
    return across
      ? { w: PITCH_LENGTH, h: PITCH_WIDTH / 2 }
      : { w: PITCH_LENGTH / 2, h: PITCH_WIDTH };
  }
  return across
    ? { w: PITCH_LENGTH / 4, h: PITCH_WIDTH }
    : { w: PITCH_LENGTH / 2, h: PITCH_WIDTH / 2 };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Flaechen rasten auf halbe/viertel Feldpositionen ein. */
export function snapArea(item: FieldItem): FieldItem {
  if (!isArea(item.kind)) return item;
  const { w, h } = areaSize(item.kind, item.rotation);
  return {
    ...item,
    x: clamp(Math.round(item.x / w) * w, 0, PITCH_LENGTH - w),
    y: clamp(Math.round(item.y / h) * h, 0, PITCH_WIDTH - h),
  };
}

const KINDS: ItemKind[] = ["half", "quarter", "goal_big", "goal_small", "goal_mini"];
const MAX_ITEMS = 200;

/** Prueft und bereinigt Elemente aus dem Client, bevor sie gespeichert werden. */
export function sanitizeItems(input: unknown): FieldItem[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, MAX_ITEMS).flatMap((raw): FieldItem[] => {
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
    if (isArea(kind)) {
      item.label = typeof r.label === "string" ? r.label.slice(0, 40) : "";
      item.color = AREA_COLORS.includes(r.color as string) ? (r.color as string) : AREA_COLORS[0];
    }
    return [item];
  });
}
