import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { updateExercise, deleteExercise } from "../actions";
import ExerciseForm from "../ExerciseForm";
import { categoryLabels } from "../categoryLabels";

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: exercise }, { data: fields }, canWrite] = await Promise.all([
    supabase
      .from("exercises")
      .select(
        "name, aufbau, ablauf, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, field_id, image_url, fields(name, length_m, width_m)",
      )
      .eq("id", id)
      .single(),
    supabase.from("fields").select("id, name, length_m, width_m").order("name"),
    isTrainer(),
  ]);

  if (!exercise) notFound();

  const field = exercise.fields as unknown as
    | { name: string; length_m: number; width_m: number }
    | null;

  const update = updateExercise.bind(null, id);
  const remove = deleteExercise.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">{exercise.name}</h1>

      {canWrite ? (
        <>
          <ExerciseForm
            action={update}
            initial={exercise}
            fields={fields ?? []}
            submitLabel="Speichern"
          />
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
        <>
          {exercise.image_url && (
            <a href={exercise.image_url} target="_blank" rel="noreferrer" className="mb-4 block">
              {/* eslint-disable-next-line @next/next/no-img-element -- externe Supabase-Storage-URL */}
              <img
                src={exercise.image_url}
                alt=""
                className="h-40 w-40 rounded border border-zinc-300 object-cover dark:border-zinc-700"
              />
            </a>
          )}
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium">Kategorie</dt>
              <dd className="text-zinc-500">{categoryLabels[exercise.category] ?? exercise.category}</dd>
            </div>
            <div>
              <dt className="font-medium">Spielfeld/Übungsfläche</dt>
              <dd className="text-zinc-500">
                {field ? `${field.name} (${field.length_m}×${field.width_m} m)` : "–"}
              </dd>
            </div>
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
        </>
      )}
    </div>
  );
}
