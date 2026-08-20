import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { saveExerciseFocuses } from "./actions";
import ExerciseFocusForm from "./ExerciseFocusForm";
import BackButton from "@/components/BackButton";

export default async function ExerciseFocusesPage() {
  const supabase = await createClient();
  const [{ data: focuses }, canWrite] = await Promise.all([
    supabase.from("exercise_focuses").select("label").order("sort_order"),
    isTrainer(),
  ]);

  const initialFocuses = (focuses ?? []).map((f) => f.label);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <BackButton href="/exercises" />
      <h1 className="mb-2 text-xl font-semibold">Übungsplanung</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Hier legst du die Übungsschwerpunkte fest, die bei einer Übung als
        Übungsschwerpunkt 1 und Übungsschwerpunkt 2 ausgewählt werden können.
      </p>

      {canWrite ? (
        <ExerciseFocusForm action={saveExerciseFocuses} initialFocuses={initialFocuses} />
      ) : (
        <>
          <p className="mb-4 text-sm text-zinc-500">
            Du hast Nur-Lese-Zugriff. Ändern können nur Trainer.
          </p>
          <ul className="space-y-1 text-sm">
            {initialFocuses.map((focus) => (
              <li key={focus}>{focus}</li>
            ))}
            {!initialFocuses.length && (
              <li className="text-zinc-500">Noch keine Übungsschwerpunkte angelegt.</li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
