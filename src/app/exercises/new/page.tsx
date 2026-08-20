import { createClient } from "@/lib/supabase/server";
import { createExercise } from "../actions";
import ExerciseForm from "../ExerciseForm";
import BackButton from "@/components/BackButton";

export default async function NewExercisePage() {
  const supabase = await createClient();
  const [{ data: fields }, { data: focuses }] = await Promise.all([
    supabase.from("fields").select("id, name, length_m, width_m").order("name"),
    supabase.from("exercise_focuses").select("label").order("sort_order"),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <BackButton href="/exercises" />
      <h1 className="mb-6 text-xl font-semibold">Neue Übung</h1>
      <ExerciseForm
        action={createExercise}
        fields={fields ?? []}
        focuses={(focuses ?? []).map((f) => f.label)}
        submitLabel="Anlegen"
      />
    </div>
  );
}
