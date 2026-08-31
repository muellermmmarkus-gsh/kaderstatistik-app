"use client";

import { useState } from "react";
import SaveNotice from "@/components/SaveNotice";
import EditSkillButton from "./EditSkillButton";

type SkillField = { key: string; value: string; isNew: boolean };

export default function SkillForm({
  action,
  initialSkills,
}: {
  action: (formData: FormData) => void;
  initialSkills: string[];
}) {
  const [skills, setSkills] = useState<SkillField[]>(() =>
    initialSkills.length
      ? initialSkills.map((value) => ({ key: crypto.randomUUID(), value, isNew: false }))
      : [{ key: crypto.randomUUID(), value: "", isNew: true }],
  );

  function updateSkill(key: string, value: string) {
    setSkills((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  }

  function addSkill() {
    setSkills((prev) => [...prev, { key: crypto.randomUUID(), value: "", isNew: true }]);
  }

  function removeSkill(key: string) {
    setSkills((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev));
  }

  return (
    <form
      action={action}
      ref={(el) => {
        // React 19 ruft nach einer erfolgreichen Form-Action automatisch
        // el.reset() auf, was die kontrollierten Textfelder sichtbar auf
        // ihren Browser-Default (leer) zuruecksetzen wuerde, obwohl der
        // React-State weiterhin die richtigen Werte haelt - siehe gleiches
        // Problem/Fix in der Trainingsplanung und den Terminarten.
        if (el) el.reset = () => {};
      }}
      className="space-y-3"
    >
      {skills.map((skill, index) => (
        <div key={skill.key} className="flex items-center gap-2">
          <input
            type="text"
            name="focus"
            value={skill.value}
            readOnly={!skill.isNew}
            onChange={(e) => skill.isNew && updateSkill(skill.key, e.target.value)}
            placeholder={skill.isNew ? `Skill ${index + 1}` : undefined}
            className={`w-full rounded border px-3 py-2 ${
              skill.isNew
                ? "border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
                : "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300"
            }`}
          />
          {!skill.isNew && (
            <EditSkillButton
              label={skill.value}
              onRenamed={(newLabel) => updateSkill(skill.key, newLabel)}
            />
          )}
          <button
            type="button"
            onClick={() => removeSkill(skill.key)}
            disabled={skills.length === 1}
            className="shrink-0 text-sm text-zinc-600 hover:underline disabled:opacity-40 dark:text-zinc-400"
          >
            entfernen
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addSkill}
        className="block text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        + weiteres Skill
      </button>

      <button
        type="submit"
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Änderungen speichern
      </button>
      <SaveNotice />
    </form>
  );
}
