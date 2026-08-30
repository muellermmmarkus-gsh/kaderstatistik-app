"use client";

import { useState } from "react";
import { categoryLabels } from "@/app/exercises/categoryLabels";

const DURATION_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

type Block = { key: string; category: string; duration: number };

const DEFAULT_BLOCKS: Omit<Block, "key">[] = [
  { category: "aufwaermen", duration: 10 },
  { category: "ueben", duration: 20 },
  { category: "spielen", duration: 20 },
  { category: "ueben", duration: 20 },
  { category: "spielen", duration: 20 },
];

export default function AiPlanModal({
  open,
  onClose,
  onGenerate,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (blocks: { category: string; duration: number }[]) => void;
}) {
  const [blocks, setBlocks] = useState<Block[]>(() =>
    DEFAULT_BLOCKS.map((b) => ({ ...b, key: crypto.randomUUID() })),
  );

  if (!open) return null;

  const totalMinutes = blocks.reduce((sum, b) => sum + b.duration, 0);

  function updateBlock(key: string, patch: Partial<Block>) {
    setBlocks((prev) => prev.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 className="mb-1 text-lg font-semibold">KI-Vorschlag erstellen</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Gib die grobe Struktur des Trainings vor. Für Üben/Spielen wählt die
          KI dazu Übungen mit den Schwerpunkten, die das Team laut
          „Performance“ am dringendsten braucht.
        </p>

        <div className="space-y-2">
          {blocks.map((block, index) => (
            <div key={block.key} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-sm text-zinc-500">
                Block {index + 1}
              </span>
              <select
                value={block.category}
                onChange={(e) => updateBlock(block.key, { category: e.target.value })}
                className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={block.duration}
                onChange={(e) => updateBlock(block.key, { duration: Number(e.target.value) })}
                className="w-28 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm font-medium">Gesamtdauer: {totalMinutes} min</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              onGenerate(blocks.map(({ category, duration }) => ({ category, duration })))
            }
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            KI-Trainingsplan erstellen
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
