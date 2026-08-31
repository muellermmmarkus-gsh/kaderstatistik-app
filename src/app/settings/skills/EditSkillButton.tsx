"use client";

import { useState, useTransition } from "react";
import { renameSkill } from "./actions";

/**
 * Zweistufiger Dialog zum Umbenennen eines bestehenden Skills:
 * 1. Warnhinweis, dass die Aenderung ueberall durchgezogen wird, 2. das
 * eigentliche Bearbeitungs-Popup. Ruft die Server-Action direkt auf (kein
 * <form>), da dieser Button innerhalb des uebergeordneten Speichern-
 * Formulars steht und ein verschachteltes <form> ungueltiges HTML waere.
 */
export default function EditSkillButton({
  label,
  onRenamed,
}: {
  label: string;
  onRenamed: (newLabel: string) => void;
}) {
  const [stage, setStage] = useState<"closed" | "warn" | "edit">("closed");
  const [value, setValue] = useState(label);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openEdit() {
    setValue(label);
    setError(null);
    setStage("edit");
  }

  function close() {
    if (isPending) return;
    setStage("closed");
  }

  function save() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Bitte einen Namen eingeben.");
      return;
    }
    startTransition(async () => {
      try {
        await renameSkill(label, trimmed);
        setStage("closed");
        onRenamed(trimmed);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Änderung fehlgeschlagen.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setStage("warn")}
        className="shrink-0 text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        ändern
      </button>

      {stage === "warn" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-4 text-sm">
              Soll dieses Skill wirklich geändert werden? Die Änderung wird durch alle
              Menüs gezogen!
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={close}
                className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={openEdit}
                className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Fortfahren
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === "edit" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <label className="mb-1 block text-sm font-medium" htmlFor="skill-rename-input">
              Skill
            </label>
            <input
              id="skill-rename-input"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              className="mb-2 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="mt-2 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={close}
                disabled={isPending}
                className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={save}
                disabled={isPending}
                className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
