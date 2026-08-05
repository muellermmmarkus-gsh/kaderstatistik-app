import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { updateExercise, deleteExercise } from "../actions";
import ExerciseForm from "../ExerciseForm";

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: exercise }, canWrite] = await Promise.all([
    supabase
      .from("exercises")
      .select(
        "name, aufbau, ablauf, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals",
      )
      .eq("id", id)
      .single(),
    isTrainer(),
  ]);

  if (!exercise) notFound();

  const update = updateExercise.bind(null, id);
  const remove = deleteExercise.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">{exercise.name}</h1>

      {canWrite ? (
        <>
          <ExerciseForm action={update} initial={exercise} submitLabel="Speichern" />
          <form action={remove} className="mt-4">
            <button
              type="submit"
              className="text-sm text-red-600 hover:underline dark:text-red-400"
            >
              Übung löschen
            </button>
          </form>
        </>
      ) : (
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium">Aufbau</dt>
            <dd className="text-zinc-500">{exercise.aufbau || "–"}</dd>
          </div>
          <div>
            <dt className="font-medium">Ablauf</dt>
            <dd className="text-zinc-500">{exercise.ablauf || "–"}</dd>
          </div>
          <div>
            <dt className="font-medium">Hauptzweck</dt>
            <dd className="text-zinc-500">{exercise.hauptzweck || "–"}</dd>
          </div>
          <div>
            <dt className="font-medium">Nebenzweck</dt>
            <dd className="text-zinc-500">{exercise.nebenzweck || "–"}</dd>
          </div>
          <div>
            <dt className="font-medium">Spieleranzahl</dt>
            <dd className="text-zinc-500">
              {exercise.min_players}–{exercise.max_players}
            </dd>
          </div>
          <div>
            <dt className="font-medium">Kleinfeldtore / Minitore</dt>
            <dd className="text-zinc-500">
              {exercise.small_goals} / {exercise.mini_goals}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
