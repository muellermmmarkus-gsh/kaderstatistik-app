import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { saveSkills } from "./actions";
import SkillForm from "./SkillForm";
import BackButton from "@/components/BackButton";

export default async function SkillsSettingsPage() {
  const supabase = await createClient();
  const [{ data: skills }, canWrite] = await Promise.all([
    supabase.from("exercise_focuses").select("label").order("sort_order"),
    isTrainer(),
  ]);

  const initialSkills = (skills ?? []).map((s) => s.label);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <h1 className="mb-2 text-xl font-semibold">Skills</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Diese Skills stehen bei Übungen als Übungsschwerpunkt 1/2, in der
        Trainingsplanung als Schwerpunkt Training und unter Performance zur
        Auswahl. Änderst du ein bestehendes Skill über „ändern“, wird die
        neue Bezeichnung sofort überall übernommen, wo es bereits verwendet
        wird.
      </p>

      {canWrite ? (
        <SkillForm action={saveSkills} initialSkills={initialSkills} />
      ) : (
        <>
          <p className="mb-4 text-sm text-zinc-500">
            Du hast Nur-Lese-Zugriff. Ändern können nur Trainer.
          </p>
          <ul className="space-y-1 text-sm">
            {initialSkills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
            {!initialSkills.length && (
              <li className="text-zinc-500">Noch keine Skills angelegt.</li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
