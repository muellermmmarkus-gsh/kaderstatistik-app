"use client";

import { useEffect, useRef, useState, useTransition, type DragEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { deleteFieldPlan, saveFieldPlan } from "./actions";
import {
  AREA_COLORS,
  FIELD_E,
  GOAL_SIZES,
  KIND_LABELS,
  MIN_AREA,
  PITCH_LENGTH as L,
  PITCH_WIDTH as W,
  areaSize,
  isArea,
  roundTo,
  setCustom,
  snapArea,
  standardAreaSize,
  type FieldItem,
  type GoalKind,
  type ItemKind,
} from "./model";

/** Eintrag im Plan-Dropdown: value "date:JJJJ-MM-TT" (Trainingstermin), Plan-ID oder "new". */
export type PlanOption = { value: string; label: string; group: "Trainingstermine" | "Weitere Pläne" };

const hrefFor = (value: string) =>
  value === "new"
    ? "/field-planning?new=1"
    : value.startsWith("date:")
      ? `/field-planning?date=${value.slice(5)}`
      : `/field-planning?plan=${value}`;

const MARGIN = 4;
const LINE = 0.15;
const PALETTE: ItemKind[] = ["half", "third", "quarter", "field_e", "goal_big", "goal_small", "goal_mini"];
const GOAL_KINDS: GoalKind[] = ["goal_big", "goal_small", "goal_mini"];
const LONG_PRESS_MS = 550;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const formatM = (v: number) => v.toLocaleString("de-DE", { maximumFractionDigits: 2 });

type Point = { x: number; y: number };
type Drag =
  | {
      mode: "move";
      start: Point;
      origins: Record<string, Point>;
      primaryId: string;
      /** Ohne Bewegung losgelassen: Auswahl auf dieses Element reduzieren bzw. es abwaehlen. */
      clickAction: "collapse" | "toggle" | null;
      dx: number;
      dy: number;
      moved: boolean;
    }
  | { mode: "resize"; id: string; ax: number; ay: number }
  | { mode: "marquee"; start: Point; additive: boolean; base: string[]; clickedId: string | null; moved: boolean };

/** Mittelpunkt eines Elements (fuer die Rahmenauswahl). */
function centerOf(item: FieldItem): Point {
  if (!isArea(item.kind)) return { x: item.x, y: item.y };
  const { w, h } = areaSize(item);
  return { x: item.x + w / 2, y: item.y + h / 2 };
}

/** Linien eines E-Jugend-Kleinfelds, laengs zur laengeren Seite der Flaeche. */
function FieldEMarkings({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const horizontal = w >= h;
  const len = horizontal ? w : h;
  const wid = horizontal ? h : w;
  const boxW = Math.min(FIELD_E.boxWidth, wid);
  const boxD = Math.min(FIELD_E.boxDepth, len / 2);
  const line = { stroke: "white", strokeOpacity: 0.85, strokeWidth: 0.12, fill: "none" } as const;
  return (
    <g
      transform={horizontal ? `translate(${x} ${y})` : `translate(${x + w} ${y}) rotate(90)`}
      pointerEvents="none"
    >
      <line x1={len / 2} y1={0} x2={len / 2} y2={wid} {...line} />
      <circle cx={len / 2} cy={wid / 2} r={0.25} fill="white" fillOpacity={0.85} />
      {[0, 1].map((side) => (
        <g key={side}>
          <rect x={side ? len - boxD : 0} y={(wid - boxW) / 2} width={boxD} height={boxW} {...line} />
          {FIELD_E.penaltySpot < len / 2 && (
            <circle
              cx={side ? len - FIELD_E.penaltySpot : FIELD_E.penaltySpot}
              cy={wid / 2}
              r={0.25}
              fill="white"
              fillOpacity={0.85}
            />
          )}
        </g>
      ))}
    </g>
  );
}

/** Masseingabe fuer angepasste Flaechen; uebernimmt den Wert beim Verlassen bzw. Enter. */
function SizeInput({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
  const commit = (raw: string) => {
    const v = Number(raw.replace(",", "."));
    if (Number.isFinite(v) && v > 0) onCommit(v);
  };
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-500">{label}</span>
      <input
        key={value}
        defaultValue={formatM(value)}
        inputMode="decimal"
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && commit(e.currentTarget.value)}
        className="w-full rounded border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}

/** Grossfeld mit allen Linien im Originalmassstab (1 SVG-Einheit = 1 m). */
function Pitch() {
  const penaltyY = (W - 40.32) / 2;
  const goalAreaY = (W - 18.32) / 2;
  const arcDy = Math.sqrt(9.15 ** 2 - 5.5 ** 2);
  const line = { stroke: "white", strokeWidth: LINE, fill: "none" } as const;
  return (
    <g>
      {/* Rasen mit Maehstreifen */}
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={(i * L) / 10} y={0} width={L / 10} height={W} fill={i % 2 ? "#4f9a3f" : "#58a548"} />
      ))}
      <rect x={0} y={0} width={L} height={W} {...line} />
      <line x1={L / 2} y1={0} x2={L / 2} y2={W} {...line} />
      <circle cx={L / 2} cy={W / 2} r={9.15} {...line} />
      <circle cx={L / 2} cy={W / 2} r={0.3} fill="white" />
      {[0, 1].map((side) => {
        const mirror = (x: number) => (side ? L - x : x);
        return (
          <g key={side}>
            <rect x={side ? L - 16.5 : 0} y={penaltyY} width={16.5} height={40.32} {...line} />
            <rect x={side ? L - 5.5 : 0} y={goalAreaY} width={5.5} height={18.32} {...line} />
            <circle cx={mirror(11)} cy={W / 2} r={0.3} fill="white" />
            <path
              d={`M ${mirror(16.5)} ${W / 2 - arcDy} A 9.15 9.15 0 0 ${side ? 0 : 1} ${mirror(16.5)} ${W / 2 + arcDy}`}
              {...line}
            />
            {/* Feste Tore des Grossfelds */}
            <rect x={side ? L : -2} y={W / 2 - 3.66} width={2} height={7.32} {...line} />
          </g>
        );
      })}
      {/* Eckviertelkreise */}
      <path d={`M 1 0 A 1 1 0 0 1 0 1`} {...line} />
      <path d={`M ${L - 1} 0 A 1 1 0 0 0 ${L} 1`} {...line} />
      <path d={`M 0 ${W - 1} A 1 1 0 0 1 1 ${W}`} {...line} />
      <path d={`M ${L} ${W - 1} A 1 1 0 0 0 ${L - 1} ${W}`} {...line} />
    </g>
  );
}

function GoalShape({ kind, selected }: { kind: GoalKind; selected: boolean }) {
  const { width, depth } = GOAL_SIZES[kind];
  // Oeffnung bei y = 0, Netz nach hinten (positive y).
  return (
    <g>
      <rect
        x={-width / 2}
        y={0}
        width={width}
        height={depth}
        fill="rgba(255,255,255,0.55)"
        stroke={selected ? "#facc15" : "white"}
        strokeWidth={selected ? 0.35 : 0.2}
      />
      <line x1={-width / 2} y1={0} x2={width / 2} y2={0} stroke="white" strokeWidth={0.35} />
    </g>
  );
}

export default function FieldPlanner({
  options,
  selection,
  planDate,
  eventHref,
  initialPlan,
  lastChange,
  canWrite,
}: {
  options: PlanOption[];
  selection: string;
  /** Datum des Trainingstermins, falls der Plan zu einem Termin gehoert. */
  planDate: string | null;
  /** Eigener Trainingstermin an diesem Tag (Button "Zurück zum Termin"). */
  eventHref: string | null;
  initialPlan: { id: string | null; name: string; items: FieldItem[] };
  lastChange: string | null;
  canWrite: boolean;
}) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [planId, setPlanId] = useState(initialPlan.id);
  const [name, setName] = useState(initialPlan.name);
  const [items, setItems] = useState<FieldItem[]>(initialPlan.items);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Mehrfachauswahl-Modus: Rahmen ziehen bzw. Elemente antippen (auch auf Touch-Geraeten).
  const [selectMode, setSelectMode] = useState(false);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const drag = useRef<Drag | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPress = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  // Kontextmenue (Rechtsklick bzw. langes Druecken) einer Flaeche.
  const [menu, setMenu] = useState<{ id: string; left: number; top: number } | null>(null);
  const menuItem = menu ? (items.find((i) => i.id === menu.id) ?? null) : null;

  const isSelected = (id: string) => selectedIds.includes(id);
  const selected = selectedIds.length === 1 ? (items.find((i) => i.id === selectedIds[0]) ?? null) : null;
  const goalCounts = Object.fromEntries(
    GOAL_KINDS.map((k) => [k, items.filter((i) => i.kind === k).length]),
  ) as Record<GoalKind, number>;

  // Warnung beim Verlassen mit ungespeicherten Aenderungen.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(next: FieldItem[]) {
    setItems(next);
    setDirty(true);
    setMessage(null);
  }

  function update(id: string, patch: Partial<FieldItem>) {
    change(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function removeSelected() {
    change(items.filter((i) => !isSelected(i.id)));
    setSelectedIds([]);
  }

  // Tastatur: Entf loescht die Auswahl, R dreht ein einzelnes Element,
  // Strg+A waehlt alles aus, Escape hebt die Auswahl auf.
  useEffect(() => {
    if (!canWrite) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedIds(items.map((i) => i.id));
      } else if (e.key === "Escape") {
        setSelectedIds([]);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length) {
        e.preventDefault();
        removeSelected();
      } else if ((e.key === "r" || e.key === "R") && selected) {
        rotate(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function toPitch(clientX: number, clientY: number) {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  }

  // Kontextmenue schliessen bei Klick daneben oder Escape.
  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [menu]);

  function openMenu(item: FieldItem, clientX: number, clientY: number) {
    if (!canWrite || !isArea(item.kind)) return;
    const box = wrapRef.current!.getBoundingClientRect();
    setSelectedIds([item.id]);
    setMenu({
      id: item.id,
      left: clamp(clientX - box.left, 0, Math.max(0, box.width - 240)),
      top: clientY - box.top,
    });
  }

  function cancelLongPress() {
    if (longPress.current) clearTimeout(longPress.current.timer);
    longPress.current = null;
  }

  /** Neue Masse einer angepassten Flaeche, Position bleibt im Platz. */
  function resize(item: FieldItem, w: number, h: number) {
    const nw = roundTo(clamp(w, MIN_AREA, L), 0.5);
    const nh = roundTo(clamp(h, MIN_AREA, W), 0.5);
    update(item.id, {
      w: nw,
      h: nh,
      x: clamp(item.x, 0, L - nw),
      y: clamp(item.y, 0, W - nh),
    });
  }

  function addItem(kind: ItemKind, at?: { x: number; y: number }) {
    const id = crypto.randomUUID();
    let item: FieldItem;
    if (isArea(kind)) {
      const { w, h } = standardAreaSize(kind, 0);
      const used = items.filter((i) => isArea(i.kind)).length;
      const pos = at ?? { x: L / 2, y: W / 2 };
      item = snapArea({
        id,
        kind,
        x: pos.x - w / 2,
        y: pos.y - h / 2,
        rotation: 0,
        label: "",
        color: AREA_COLORS[used % AREA_COLORS.length],
      });
    } else {
      const pos = at ?? { x: L / 2, y: W / 2 };
      item = { id, kind, x: roundTo(pos.x, 0.5), y: roundTo(pos.y, 0.5), rotation: 0 };
    }
    change([...items, item]);
    setSelectedIds([id]);
  }

  function rotate(item: FieldItem) {
    if (!isArea(item.kind)) {
      update(item.id, { rotation: (item.rotation + 90) % 360 });
      return;
    }
    const rotation = item.rotation === 90 ? 0 : 90;
    if (item.custom && item.w && item.h) {
      // Angepasste Flaeche um ihren Mittelpunkt drehen (Masse tauschen).
      const cx = item.x + item.w / 2;
      const cy = item.y + item.h / 2;
      update(item.id, snapArea({ ...item, rotation, w: item.h, h: item.w, x: cx - item.h / 2, y: cy - item.w / 2 }));
    } else {
      update(item.id, snapArea({ ...item, rotation }));
    }
  }

  function startMarquee(e: PointerEvent, clickedId: string | null) {
    drag.current = {
      mode: "marquee",
      start: toPitch(e.clientX, e.clientY),
      additive: selectMode || e.shiftKey || e.ctrlKey || e.metaKey,
      base: selectedIds,
      clickedId,
      moved: false,
    };
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  function onBackgroundPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    if (!canWrite) {
      setSelectedIds([]);
      return;
    }
    startMarquee(e, null);
  }

  function onItemPointerDown(e: PointerEvent, item: FieldItem) {
    e.stopPropagation();
    if (e.button !== 0) return;
    if (!canWrite) {
      setSelectedIds([item.id]);
      return;
    }
    const wasSelected = isSelected(item.id);
    // Im Auswahlmodus startet ein nicht markiertes Element einen Rahmen bzw. wird per Tippen markiert.
    if (selectMode && !wasSelected) {
      startMarquee(e, item.id);
      return;
    }
    if (!selectMode && (e.shiftKey || e.ctrlKey || e.metaKey)) {
      setSelectedIds(wasSelected ? selectedIds.filter((id) => id !== item.id) : [...selectedIds, item.id]);
      return;
    }
    const ids = wasSelected ? selectedIds : [item.id];
    if (!wasSelected) setSelectedIds(ids);
    const origins: Record<string, Point> = {};
    for (const i of items) if (ids.includes(i.id)) origins[i.id] = { x: i.x, y: i.y };
    drag.current = {
      mode: "move",
      start: toPitch(e.clientX, e.clientY),
      origins,
      primaryId: item.id,
      clickAction: selectMode ? "toggle" : wasSelected && ids.length > 1 ? "collapse" : null,
      dx: 0,
      dy: 0,
      moved: false,
    };
    svgRef.current?.setPointerCapture(e.pointerId);
    // Auf Touch-Geraeten oeffnet langes Druecken das Kontextmenue.
    if (e.pointerType !== "mouse" && isArea(item.kind) && ids.length === 1) {
      const { clientX, clientY } = e;
      cancelLongPress();
      longPress.current = {
        x: clientX,
        y: clientY,
        timer: setTimeout(() => {
          longPress.current = null;
          drag.current = null;
          openMenu(item, clientX, clientY);
        }, LONG_PRESS_MS),
      };
    }
  }

  function onHandlePointerDown(e: PointerEvent, item: FieldItem, ax: number, ay: number) {
    e.stopPropagation();
    drag.current = { mode: "resize", id: item.id, ax, ay };
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    const lp = longPress.current;
    if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 8) cancelLongPress();
    const d = drag.current;
    if (!d) return;
    const p = toPitch(e.clientX, e.clientY);
    if (d.mode === "resize") {
      // Gegenueberliegende Ecke bleibt fest, mindestens MIN_AREA Meter.
      const px = roundTo(clamp(p.x, 0, L), 0.5);
      const py = roundTo(clamp(p.y, 0, W), 0.5);
      const x2 = Math.abs(px - d.ax) < MIN_AREA ? d.ax + (px < d.ax ? -MIN_AREA : MIN_AREA) : px;
      const y2 = Math.abs(py - d.ay) < MIN_AREA ? d.ay + (py < d.ay ? -MIN_AREA : MIN_AREA) : py;
      setItems((prev) =>
        prev.map((i) =>
          i.id === d.id
            ? { ...i, x: Math.min(d.ax, x2), y: Math.min(d.ay, y2), w: Math.abs(x2 - d.ax), h: Math.abs(y2 - d.ay) }
            : i,
        ),
      );
    } else if (d.mode === "marquee") {
      const x = Math.min(d.start.x, p.x);
      const y = Math.min(d.start.y, p.y);
      const w = Math.abs(p.x - d.start.x);
      const h = Math.abs(p.y - d.start.y);
      if (!d.moved && Math.hypot(w, h) < 1) return;
      d.moved = true;
      setMarquee({ x, y, w, h });
      return;
    } else {
      const { dx, dy } = clampGroupDelta(d.origins, p.x - d.start.x, p.y - d.start.y);
      if (!d.moved && Math.hypot(dx, dy) < 0.3) return;
      d.moved = true;
      d.dx = dx;
      d.dy = dy;
      setItems((prev) => moveGroup(prev, d.origins, dx, dy, true));
    }
    setDirty(true);
  }

  /** Bei mehreren Elementen bleiben alle Flaechen innerhalb des Platzes. */
  function clampGroupDelta(origins: Record<string, Point>, dx: number, dy: number) {
    const ids = Object.keys(origins);
    if (ids.length < 2) return { dx, dy };
    let [minX, maxX, minY, maxY] = [-Infinity, Infinity, -Infinity, Infinity];
    for (const i of items) {
      if (!origins[i.id] || !isArea(i.kind)) continue;
      const { w, h } = areaSize(i);
      const o = origins[i.id];
      minX = Math.max(minX, -o.x);
      maxX = Math.min(maxX, L - w - o.x);
      minY = Math.max(minY, -o.y);
      maxY = Math.min(maxY, W - h - o.y);
    }
    return {
      dx: minX <= maxX ? clamp(dx, minX, maxX) : dx,
      dy: minY <= maxY ? clamp(dy, minY, maxY) : dy,
    };
  }

  /** Verschiebt alle Elemente aus origins um dx/dy; Tore auf einen halben Meter genau. */
  function moveGroup(list: FieldItem[], origins: Record<string, Point>, dx: number, dy: number, live: boolean) {
    const single = Object.keys(origins).length === 1;
    return list.map((i) => {
      const o = origins[i.id];
      if (!o) return i;
      const free = live && single && isArea(i.kind);
      return {
        ...i,
        x: free ? o.x + dx : roundTo(o.x + dx, 0.5),
        y: free ? o.y + dy : roundTo(o.y + dy, 0.5),
      };
    });
  }

  function onPointerUp() {
    cancelLongPress();
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (d.mode === "resize") {
      setItems((prev) => prev.map((i) => (i.id === d.id ? snapArea(i) : i)));
      return;
    }
    if (d.mode === "marquee") {
      setMarquee(null);
      if (!d.moved) {
        if (d.clickedId) {
          setSelectedIds(d.base.includes(d.clickedId) ? d.base.filter((id) => id !== d.clickedId) : [...d.base, d.clickedId]);
        } else if (!d.additive) {
          setSelectedIds([]);
        }
        return;
      }
      const m = marquee;
      if (!m) return;
      const hits = items
        .filter((i) => {
          const c = centerOf(i);
          return c.x >= m.x && c.x <= m.x + m.w && c.y >= m.y && c.y <= m.y + m.h;
        })
        .map((i) => i.id);
      setSelectedIds(d.additive ? [...new Set([...d.base, ...hits])] : hits);
      return;
    }
    if (!d.moved) {
      if (d.clickAction === "collapse") setSelectedIds([d.primaryId]);
      if (d.clickAction === "toggle") setSelectedIds(selectedIds.filter((id) => id !== d.primaryId));
      return;
    }
    const ids = Object.keys(d.origins);
    if (ids.length === 1) {
      // Einzelne Flaeche rastet beim Loslassen ein (siehe snapArea).
      setItems((prev) => prev.map((i) => (i.id === d.primaryId ? snapArea(i) : i)));
      return;
    }
    // Gruppe: an der ersten einrastenden Flaeche ausrichten, Abstaende bleiben erhalten.
    let dx = roundTo(d.dx, 0.5);
    let dy = roundTo(d.dy, 0.5);
    const anchor =
      items.find((i) => i.id === d.primaryId && isArea(i.kind) && !i.custom && i.kind !== "field_e") ??
      items.find((i) => d.origins[i.id] && isArea(i.kind) && !i.custom && i.kind !== "field_e");
    if (anchor) {
      const o = d.origins[anchor.id];
      const moved = { ...anchor, x: o.x + dx, y: o.y + dy };
      const snapped = snapArea(moved);
      dx += snapped.x - moved.x;
      dy += snapped.y - moved.y;
    }
    ({ dx, dy } = clampGroupDelta(d.origins, dx, dy));
    setItems((prev) => moveGroup(prev, d.origins, dx, dy, false));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const kind = e.dataTransfer.getData("text/plain") as ItemKind;
    if (!canWrite || !PALETTE.includes(kind)) return;
    addItem(kind, toPitch(e.clientX, e.clientY));
  }

  /** Speichert den Plan; liefert die Plan-ID oder null bei einem Fehler. */
  async function persist() {
    const result = await saveFieldPlan(planId, name, items, planDate);
    if (result.error || !result.id) {
      setMessage({ text: result.error ?? "Plan konnte nicht gespeichert werden.", error: true });
      return null;
    }
    setDirty(false);
    setMessage({ text: "Gespeichert." });
    setPlanId(result.id);
    return result.id;
  }

  function save() {
    startTransition(async () => {
      const isNew = !planId;
      const id = await persist();
      if (!id) return;
      // Neuer Plan ohne Termin: in der URL festhalten, damit er nach dem Neuladen offen bleibt.
      if (isNew && !planDate) router.replace(hrefFor(id));
      else router.refresh();
    });
  }

  function removePlan() {
    if (!planId || !window.confirm(`Plan "${name}" wirklich löschen?`)) return;
    startTransition(async () => {
      const result = await deleteFieldPlan(planId);
      if (result.error) {
        setMessage({ text: result.error, error: true });
        return;
      }
      setDirty(false);
      if (planDate) {
        // Der Termin bleibt, nur sein Plan ist wieder leer.
        setPlanId(null);
        setItems([]);
        setSelectedIds([]);
        router.refresh();
      } else {
        router.replace("/field-planning");
      }
    });
  }

  // Verlassen mit ungespeicherten Aenderungen: erst nachfragen (Speichern / Verwerfen / Abbrechen).
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null);

  function navigate(href: string) {
    if (dirty && canWrite) {
      setLeaveTarget(href);
      return;
    }
    router.push(href);
  }

  function saveAndLeave() {
    const target = leaveTarget;
    if (!target) return;
    startTransition(async () => {
      if (!(await persist())) {
        // Fehlermeldung steht in der Statuszeile; auf der Seite bleiben.
        setLeaveTarget(null);
        return;
      }
      setLeaveTarget(null);
      router.push(target);
    });
  }

  function discardAndLeave() {
    const target = leaveTarget;
    setLeaveTarget(null);
    setDirty(false);
    if (target) router.push(target);
  }

  const itemCursor = (id: string) =>
    canWrite ? (selectMode && !isSelected(id) ? "cursor-crosshair" : "cursor-move") : undefined;

  const areas = items.filter((i) => isArea(i.kind));
  const goals = items.filter((i) => !isArea(i.kind));

  return (
    <div>
      {/* Plan-Auswahl und Speichern */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {eventHref && (
          <button
            type="button"
            onClick={() => navigate(eventHref)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
          >
            ← Zurück zum Termin
          </button>
        )}
        <select
          value={selection}
          onChange={(e) => navigate(hrefFor(e.target.value))}
          aria-label="Trainingstermin oder Plan auswählen"
          className="max-w-full rounded border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {selection === "new" && <option value="new">– neuer Plan –</option>}
          {(["Trainingstermine", "Weitere Pläne"] as const).map((group) => {
            const groupOptions = options.filter((o) => o.group === group);
            if (!groupOptions.length) return null;
            return (
              <optgroup key={group} label={group}>
                {groupOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        {/* Plaene zu Trainingsterminen heissen automatisch nach dem Datum */}
        {!planDate && (
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            disabled={!canWrite}
            maxLength={100}
            placeholder="Name, z.B. Di 17:00 Kunstrasen"
            aria-label="Name des Plans"
            className="min-w-48 flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        )}
        {canWrite && (
          <>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {pending ? "Speichert…" : "Speichern"}
            </button>
            <button
              type="button"
              onClick={() => navigate(hrefFor("new"))}
              title="Plan ohne Trainingstermin, z.B. für Turniere oder Vorlagen"
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            >
              Neuer Plan
            </button>
            {planId && (
              <button
                type="button"
                onClick={removePlan}
                disabled={pending}
                className="rounded border border-red-300 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:text-red-400"
              >
                Plan löschen
              </button>
            )}
          </>
        )}
      </div>
      {/* Feste Hoehe, damit das Spielfeld beim ersten Aendern nicht unter dem Zeiger verrutscht */}
      <p className="mb-3 min-h-4 text-xs text-zinc-500">
        {dirty ? "Ungespeicherte Änderungen. " : ""}
        {message && <span className={message.error ? "text-red-600" : "text-green-700"}>{message.text} </span>}
        {lastChange && !dirty && <span>{lastChange}</span>}
      </p>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Elemente zum Ziehen bzw. Anklicken */}
        {canWrite && (
          <aside className="flex shrink-0 flex-wrap gap-2 lg:w-44 lg:flex-col">
            <p className="w-full text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Elemente – ziehen oder klicken
            </p>
            {PALETTE.map((kind) => (
              <button
                key={kind}
                type="button"
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", kind)}
                onClick={() => addItem(kind)}
                className="flex items-center justify-between gap-2 rounded border border-zinc-300 bg-white px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <span>{KIND_LABELS[kind]}</span>
                {!isArea(kind) && (
                  <span
                    className="rounded bg-zinc-900 px-1.5 text-xs font-semibold text-white tabular-nums dark:bg-zinc-100 dark:text-zinc-900"
                    title="So viele Tore dieser Art stehen auf dem Platz"
                  >
                    {goalCounts[kind as GoalKind]}
                  </span>
                )}
              </button>
            ))}
          </aside>
        )}

        {/* Spielfeld */}
        <div ref={wrapRef} className="relative min-w-0 flex-1">
          {canWrite && (
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                aria-pressed={selectMode}
                onClick={() => setSelectMode((on) => !on)}
                className={`rounded border px-3 py-1.5 ${selectMode ? "border-yellow-500 bg-yellow-50 font-medium dark:bg-yellow-950" : "border-zinc-300 dark:border-zinc-700"}`}
              >
                ⬚ Mehrfachauswahl {selectMode ? "an" : "aus"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(items.map((i) => i.id))}
                disabled={!items.length}
                className="rounded border border-zinc-300 px-3 py-1.5 disabled:opacity-50 dark:border-zinc-700"
              >
                Alle auswählen
              </button>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
                >
                  Auswahl aufheben ({selectedIds.length})
                </button>
              )}
              <span className="text-xs text-zinc-500">
                {selectMode
                  ? "Rahmen aufziehen oder Elemente antippen; markierte Elemente gemeinsam ziehen."
                  : "Mehrere markieren: Shift/Strg + Klick oder Rahmen auf freier Fläche ziehen."}
              </span>
            </div>
          )}
          <svg
            ref={svgRef}
            viewBox={`${-MARGIN} ${-MARGIN} ${L + 2 * MARGIN} ${W + 2 * MARGIN}`}
            className={`w-full touch-none select-none rounded-lg bg-[#3f8a32] ${selectMode ? "cursor-crosshair" : ""}`}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerDown={onBackgroundPointerDown}
            onDragOver={(e) => canWrite && e.preventDefault()}
            onDrop={onDrop}
            onContextMenu={(e) => e.preventDefault()}
            role="application"
            aria-label="Trainingsplatz"
          >
            <Pitch />
            {areas.map((item) => {
              const { w, h } = areaSize(item);
              const isSel = isSelected(item.id);
              return (
                <g
                  key={item.id}
                  onPointerDown={(e) => onItemPointerDown(e, item)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openMenu(item, e.clientX, e.clientY);
                  }}
                  className={itemCursor(item.id)}
                >
                  <rect
                    x={item.x + 0.3}
                    y={item.y + 0.3}
                    width={w - 0.6}
                    height={h - 0.6}
                    fill={item.color}
                    fillOpacity={0.25}
                    stroke={isSel ? "#facc15" : item.color}
                    strokeWidth={isSel ? 0.6 : 0.4}
                    strokeDasharray={isSel ? undefined : "1.5 1"}
                  />
                  {item.kind === "field_e" && <FieldEMarkings x={item.x} y={item.y} w={w} h={h} />}
                  <text
                    x={item.x + w / 2}
                    y={item.y + h / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={Math.min(4, w / 8, h / 3)}
                    fontWeight="bold"
                    fill="white"
                    stroke="rgba(0,0,0,0.45)"
                    strokeWidth={0.15}
                    paintOrder="stroke"
                  >
                    {item.label?.trim() || (canWrite ? "Mannschaft?" : "")}
                  </text>
                  {/* Dezente Markierung fuer vom Standard abweichende Flaechen */}
                  {item.custom && (
                    <text
                      x={item.x + 1.2}
                      y={item.y + 2.2}
                      fontSize={1.6}
                      fill="white"
                      fillOpacity={0.85}
                      pointerEvents="none"
                    >
                      ✎ angepasst · {formatM(w)} × {formatM(h)} m
                    </text>
                  )}
                  {isSel && selectedIds.length === 1 && item.custom && canWrite &&
                    [
                      [item.x, item.y],
                      [item.x + w, item.y],
                      [item.x, item.y + h],
                      [item.x + w, item.y + h],
                    ].map(([cx, cy], i) => (
                      <g
                        key={i}
                        onPointerDown={(e) =>
                          onHandlePointerDown(e, item, cx === item.x ? item.x + w : item.x, cy === item.y ? item.y + h : item.y)
                        }
                        className={i === 0 || i === 3 ? "cursor-nwse-resize" : "cursor-nesw-resize"}
                      >
                        <circle cx={cx} cy={cy} r={2.5} fill="transparent" />
                        <rect x={cx - 0.8} y={cy - 0.8} width={1.6} height={1.6} fill="white" stroke="#facc15" strokeWidth={0.3} />
                      </g>
                    ))}
                </g>
              );
            })}
            {goals.map((item) => (
              <g
                key={item.id}
                transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}
                onPointerDown={(e) => onItemPointerDown(e, item)}
                className={itemCursor(item.id)}
              >
                {/* Groessere, unsichtbare Klickflaeche fuer kleine Tore */}
                <rect x={-4} y={-2} width={8} height={5} fill="transparent" />
                <GoalShape kind={item.kind as GoalKind} selected={isSelected(item.id)} />
              </g>
            ))}
            {marquee && (
              <rect
                x={marquee.x}
                y={marquee.y}
                width={marquee.w}
                height={marquee.h}
                fill="rgba(250,204,21,0.15)"
                stroke="#facc15"
                strokeWidth={0.3}
                strokeDasharray="1 0.6"
                pointerEvents="none"
              />
            )}
          </svg>

          {menu && menuItem && (
            <div
              ref={menuRef}
              role="menu"
              style={{ left: menu.left, top: menu.top }}
              className="absolute z-20 w-60 rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="mb-2 font-medium">
                {KIND_LABELS[menuItem.kind]}
                {menuItem.label?.trim() ? ` – ${menuItem.label.trim()}` : ""}
              </p>
              <button
                type="button"
                role="switch"
                aria-checked={!!menuItem.custom}
                onClick={() => update(menuItem.id, setCustom(menuItem, !menuItem.custom))}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span>Feld vom Standard ändern</span>
                <span
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${menuItem.custom ? "bg-green-600" : "bg-zinc-300 dark:bg-zinc-700"}`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${menuItem.custom ? "left-[1.125rem]" : "left-0.5"}`}
                  />
                </span>
              </button>
              <p className="mt-2 text-xs text-zinc-500">
                {menuItem.custom
                  ? "Ecken der Fläche ziehen oder Maße rechts eingeben. Ausschalten setzt auf Standard zurück."
                  : "Einschalten, um Größe und Position frei anzupassen."}
              </p>
            </div>
          )}

          <p className="mt-2 text-xs text-zinc-500">
            Tore auf dem Platz: {GOAL_KINDS.map((k) => `${KIND_LABELS[k]} ${goalCounts[k]}`).join(" · ")}
            {" · "}Flächen rasten auf halbe/drittel/viertel Platzpositionen ein. Rechtsklick (Handy:
            lange drücken) auf eine Fläche, um sie vom Standard abweichend anzupassen.
          </p>
        </div>

        {/* Eigenschaften des ausgewaehlten Elements */}
        {canWrite && (
          <aside className="shrink-0 rounded-lg border border-zinc-200 p-3 text-sm lg:w-60 dark:border-zinc-800">
            {selected ? (
              <div className="space-y-3">
                <p className="font-medium">{KIND_LABELS[selected.kind]}</p>
                {isArea(selected.kind) && (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-xs text-zinc-500">Mannschaft</span>
                      <input
                        value={selected.label ?? ""}
                        onChange={(e) => update(selected.id, { label: e.target.value.slice(0, 40) })}
                        autoFocus
                        placeholder="z.B. TVG E1"
                        className="w-full rounded border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <div>
                      <span className="mb-1 block text-xs text-zinc-500">Farbe</span>
                      <div className="flex gap-1.5">
                        {AREA_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => update(selected.id, { color })}
                            aria-label={`Farbe ${color}`}
                            className={`h-6 w-6 rounded-full border-2 ${selected.color === color ? "border-zinc-900 dark:border-white" : "border-transparent"}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    {selected.custom ? (
                      <div className="grid grid-cols-2 gap-2">
                        <SizeInput
                          label="Länge (m)"
                          value={areaSize(selected).w}
                          onCommit={(v) => resize(selected, v, areaSize(selected).h)}
                        />
                        <SizeInput
                          label="Breite (m)"
                          value={areaSize(selected).h}
                          onCommit={(v) => resize(selected, areaSize(selected).w, v)}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        {formatM(areaSize(selected).w)} × {formatM(areaSize(selected).h)} m (Standard)
                      </p>
                    )}
                  </>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => rotate(selected)}
                    className="rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
                    title="Taste R"
                  >
                    {isArea(selected.kind) && selected.kind !== "field_e" && !selected.custom
                      ? selected.rotation === 90
                        ? "Längs teilen"
                        : "Quer teilen"
                      : "Drehen 90°"}
                  </button>
                  <button
                    type="button"
                    onClick={removeSelected}
                    className="rounded border border-red-300 px-3 py-1.5 text-red-700 dark:border-red-900 dark:text-red-400"
                    title="Taste Entf"
                  >
                    Entfernen
                  </button>
                </div>
              </div>
            ) : selectedIds.length > 1 ? (
              <div className="space-y-3">
                <p className="font-medium">{selectedIds.length} Elemente ausgewählt</p>
                <p className="text-xs text-zinc-500">
                  Ein markiertes Element ziehen, um alle gemeinsam zu verschieben. Abstände bleiben
                  erhalten.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
                  >
                    Auswahl aufheben
                  </button>
                  <button
                    type="button"
                    onClick={removeSelected}
                    className="rounded border border-red-300 px-3 py-1.5 text-red-700 dark:border-red-900 dark:text-red-400"
                    title="Taste Entf"
                  >
                    Alle entfernen
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500">
                Element anklicken, um Mannschaft, Farbe oder Ausrichtung zu ändern.
              </p>
            )}
          </aside>
        )}
      </div>

      {leaveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
            <p className="mb-4 text-sm font-medium">
              Es gibt ungespeicherte Änderungen am Trainingsplatzplan. Sollen sie gespeichert werden?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveAndLeave}
                disabled={pending}
                className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {pending ? "Speichert…" : "Speichern und weiter"}
              </button>
              <button
                type="button"
                onClick={discardAndLeave}
                disabled={pending}
                className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
              >
                Verwerfen
              </button>
              <button
                type="button"
                onClick={() => setLeaveTarget(null)}
                disabled={pending}
                className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
