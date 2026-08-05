import { createExercise } from "../actions";
import ExerciseForm from "../ExerciseForm";

export default function NewExercisePage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Neue Übung</h1>
      <ExerciseForm action={createExercise} submitLabel="Anlegen" />
    </div>
  );
}
