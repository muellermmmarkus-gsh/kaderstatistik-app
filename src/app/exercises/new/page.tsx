import { createClient } from "@/lib/supabase/server";
import { createExercise } from "../actions";
import ExerciseForm from "../ExerciseForm";

export default async function NewExercisePage() {
  const supabase = await createClient();
  const { data: fields } = await supabase
    .from("fields")
    .select("id, name, length_m, width_m")
    .order("name");

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Neue Übung</h1>
      <ExerciseForm action={createExercise} fields={fields ?? []} submitLabel="Anlegen" />
    </div>
  );
}
