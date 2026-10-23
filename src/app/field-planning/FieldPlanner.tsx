"use client";

import { useEffect, useRef, useState, useTransition, type DragEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { deleteFieldPlan, saveFieldPlan } from "./actions";
import {
  AREA_COLORS,
  GOAL_SIZES,
  KIND_LABELS,
  PITCH_LENGTH as L,
  PITCH_WIDTH as W,
  areaSize,
  isArea,
  snapArea,
  type FieldItem,
  type GoalKind,
  type ItemKind,
} from "./model";

export type PlanSummary = { id: string; name: string; updatedAt: string; teamName: string | null };

const MARGIN = 4;
const LINE = 0.15;
const PALETTE: ItemKind[] = ["half", "quarter", "goal_big", "goal_small", "goal_mini"];
const GOAL_KINDS: GoalKind[] = ["goal_big", "goal_small", "goal_mini"];

const roundTo = (v: number, step: number) => Math.round(v / step) * step;

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
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

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

  function addItem(kind: ItemKind, at?: { x: number; y: number }) {
    const id = crypto.randomUUID();
    let item: FieldItem;
    if (isArea(kind)) {
      const { w, h } = areaSize(kind, 0);
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
    if (isArea(item.kind)) {
      update(item.id, snapArea({ ...item, rotation: item.rotation === 90 ? 0 : 90 }));
    } else {
      update(item.id, { rotation: (item.rotation + 90) % 360 });
    }
  }

  function onItemPointerDown(e: PointerEvent, item: FieldItem) {
    e.stopPropagation();
    setSelectedId(item.id);
    if (!canWrite) return;
    const p = toPitch(e.clientX, e.clientY);
    drag.current = { id: item.id, dx: p.x - item.x, dy: p.y - item.y };
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const p = toPitch(e.clientX, e.clientY);
    setItems((prev) =>
      prev.map((i) =>
        i.id === d.id
          ? isArea(i.kind)
            ? { ...i, x: p.x - d.dx, y: p.y - d.dy }
            : { ...i, x: roundTo(p.x - d.dx, 0.5), y: roundTo(p.y - d.dy, 0.5) }
          : i,
      ),
    );
    setDirty(true);
  }

  function onPointerUp() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    // Flaechen rasten beim Loslassen auf halbe/viertel Feldpositionen ein.
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
        <div className="min-w-0 flex-1">
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
            role="application"
            aria-label="Trainingsplatz"
          >
            <Pitch />
            {areas.map((item) => {
              const { w, h } = areaSize(item.kind as "half" | "quarter", item.rotation);
              const isSel = item.id === selectedId;
              return (
                <g
                  key={item.id}
                  onPointerDown={(e) => onItemPointerDown(e, item)}
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
                  <text
                    x={item.x + w / 2}
                    y={item.y + h / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={Math.min(4, w / 8)}
                    fontWeight="bold"
                    fill="white"
                    stroke="rgba(0,0,0,0.45)"
                    strokeWidth={0.15}
                    paintOrder="stroke"
                  >
                    {item.label?.trim() || (canWrite ? "Mannschaft?" : "")}
                  </text>
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

          <p className="mt-2 text-xs text-zinc-500">
            Tore auf dem Platz: {GOAL_KINDS.map((k) => `${KIND_LABELS[k]} ${goalCounts[k]}`).join(" · ")}
            {" · "}Flächen rasten auf halbe/viertel Platzpositionen ein.
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
                  </>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => rotate(selected)}
                    className="rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
                    title="Taste R"
                  >
                    {isArea(selected.kind)
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
