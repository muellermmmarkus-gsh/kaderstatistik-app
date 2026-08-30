"use client";

import { useState } from "react";
import SaveNotice from "@/components/SaveNotice";

type TypeField = { formKey: string; key: string; label: string };

export default function EventTypeForm({
  action,
  initialTypes,
}: {
  action: (formData: FormData) => void;
  initialTypes: { key: string; label: string }[];
}) {
  const [types, setTypes] = useState<TypeField[]>(() =>
    initialTypes.map((t) => ({ formKey: crypto.randomUUID(), key: t.key, label: t.label })),
  );

  function updateLabel(formKey: string, label: string) {
    setTypes((prev) => prev.map((t) => (t.formKey === formKey ? { ...t, label } : t)));
  }

  function addType() {
    setTypes((prev) => [...prev, { formKey: crypto.randomUUID(), key: "", label: "" }]);
  }

  function resetToInitial() {
    setTypes(
      initialTypes.map((t) => ({ formKey: crypto.randomUUID(), key: t.key, label: t.label })),
    );
  }

  return (
    <form
      action={action}
      ref={(el) => {
        // React 19 ruft nach einer erfolgreichen Form-Action automatisch
        // el.reset() auf, was die kontrollierten Textfelder sichtbar auf
        // ihren Browser-Default (leer) zuruecksetzen wuerde, obwohl der
        // React-State weiterhin die richtigen Werte haelt - siehe gleiches
        // Problem/Fix in der Trainingsplanung.
        if (el) el.reset = () => {};
      }}
      className="space-y-3"
    >
      {types.map((type, index) => (
        <div key={type.formKey} className="flex items-center gap-2">
          <input type="hidden" name="key" value={type.key} />
          <input
            type="text"
            name="label"
            value={type.label}
            onChange={(e) => updateLabel(type.formKey, e.target.value)}
            placeholder={type.key ? undefined : `Terminart ${index + 1}`}
            className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={addType}
        className="block text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        + zusätzliche Terminart
      </button>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Speichern
        </button>
        <button
          type="button"
          onClick={resetToInitial}
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Abbrechen
        </button>
      </div>
      <SaveNotice />
    </form>
  );
}
