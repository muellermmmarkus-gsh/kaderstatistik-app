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

export type PlanSummary = { id: string; name: string; updatedAt: string; teamName: string | null };

const MARGIN = 4;
const LINE = 0.15;
const PALETTE: ItemKind[] = ["half", "third", "quarter", "field_e", "goal_big", "goal_small", "goal_mini"];
const GOAL_KINDS: GoalKind[] = ["goal_big", "goal_small", "goal_mini"];
const LONG_PRESS_MS = 550;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const formatM = (v: number) => v.toLocaleString("de-DE", { maximumFractionDigits: 2 });

type Drag =
  | { mode: "move"; id: string; dx: number; dy: number }
  | { mode: "resize"; id: string; ax: number; ay: number };

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
  plans,
  initialPlan,
  lastChange,
  canWrite,
}: {
  plans: PlanSummary[];
  initialPlan: { id: string | null; name: string; items: FieldItem[] };
  lastChange: string | null;
  canWrite: boolean;
}) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [planId, setPlanId] = useState(initialPlan.id);
  const [name, setName] = useState(initialPlan.name);
  const [items, setItems] = useState<FieldItem[]>(initialPlan.items);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const selected = items.find((i) => i.id === selectedId) ?? null;
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

  function remove(id: string) {
    change(items.filter((i) => i.id !== id));
    setSelectedId(null);
  }

  // Tastatur: Entf loescht, R dreht das ausgewaehlte Element.
  useEffect(() => {
    if (!canWrite || !selected) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove(selected.id);
      } else if (e.key === "r" || e.key === "R") {
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
    setSelectedId(item.id);
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
    setSelectedId(id);
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

  function onItemPointerDown(e: PointerEvent, item: FieldItem) {
    e.stopPropagation();
    if (e.button !== 0) return;
    setSelectedId(item.id);
    if (!canWrite) return;
    const p = toPitch(e.clientX, e.clientY);
    drag.current = { mode: "move", id: item.id, dx: p.x - item.x, dy: p.y - item.y };
    svgRef.current?.setPointerCapture(e.pointerId);
    // Auf Touch-Geraeten oeffnet langes Druecken das Kontextmenue.
    if (e.pointerType !== "mouse" && isArea(item.kind)) {
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
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.id === d.id
            ? isArea(i.kind)
              ? { ...i, x: p.x - d.dx, y: p.y - d.dy }
              : { ...i, x: roundTo(p.x - d.dx, 0.5), y: roundTo(p.y - d.dy, 0.5) }
            : i,
        ),
      );
    }
    setDirty(true);
  }

  function onPointerUp() {
    cancelLongPress();
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    // Flaechen rasten beim Loslassen ein (siehe snapArea).
    setItems((prev) => prev.map((i) => (i.id === d.id ? snapArea(i) : i)));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const kind = e.dataTransfer.getData("text/plain") as ItemKind;
    if (!canWrite || !PALETTE.includes(kind)) return;
    addItem(kind, toPitch(e.clientX, e.clientY));
  }

  function save() {
    startTransition(async () => {
      const result = await saveFieldPlan(planId, name, items);
      if (result.error) {
        setMessage({ text: result.error, error: true });
        return;
      }
      setDirty(false);
      setMessage({ text: "Gespeichert." });
      if (!planId && result.id) {
        setPlanId(result.id);
        router.replace(`/field-planning?plan=${result.id}`);
      } else {
        router.refresh();
      }
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
      router.replace("/field-planning");
    });
  }

  function openPlan(target: string) {
    if (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?")) return;
    setDirty(false);
    router.push(target === "new" ? "/field-planning?new=1" : `/field-planning?plan=${target}`);
  }

  const areas = items.filter((i) => isArea(i.kind));
  const goals = items.filter((i) => !isArea(i.kind));

  return (
    <div>
      {/* Plan-Auswahl und Speichern */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={planId ?? "new"}
          onChange={(e) => openPlan(e.target.value)}
          aria-label="Plan auswählen"
          className="rounded border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {!planId && <option value="new">– neuer Plan –</option>}
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
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
              onClick={() => openPlan("new")}
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
      <p className="mb-3 text-xs text-zinc-500">
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
          <svg
            ref={svgRef}
            viewBox={`${-MARGIN} ${-MARGIN} ${L + 2 * MARGIN} ${W + 2 * MARGIN}`}
            className="w-full touch-none select-none rounded-lg bg-[#3f8a32]"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerDown={() => setSelectedId(null)}
            onDragOver={(e) => canWrite && e.preventDefault()}
            onDrop={onDrop}
            onContextMenu={(e) => e.preventDefault()}
            role="application"
            aria-label="Trainingsplatz"
          >
            <Pitch />
            {areas.map((item) => {
              const { w, h } = areaSize(item);
              const isSel = item.id === selectedId;
              return (
                <g
                  key={item.id}
                  onPointerDown={(e) => onItemPointerDown(e, item)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openMenu(item, e.clientX, e.clientY);
                  }}
                  className={canWrite ? "cursor-move" : undefined}
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
                  {isSel && item.custom && canWrite &&
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
                className={canWrite ? "cursor-move" : undefined}
              >
                {/* Groessere, unsichtbare Klickflaeche fuer kleine Tore */}
                <rect x={-4} y={-2} width={8} height={5} fill="transparent" />
                <GoalShape kind={item.kind as GoalKind} selected={item.id === selectedId} />
              </g>
            ))}
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
                    onClick={() => remove(selected.id)}
                    className="rounded border border-red-300 px-3 py-1.5 text-red-700 dark:border-red-900 dark:text-red-400"
                    title="Taste Entf"
                  >
                    Entfernen
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
    </div>
  );
}
