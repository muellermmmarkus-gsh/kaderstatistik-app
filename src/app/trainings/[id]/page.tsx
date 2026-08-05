import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { updateTraining, deleteTrainingAction } from "./actions";
import TrainingBuilder from "../TrainingBuilder";

type TrainingExerciseRow = {
  duration_minutes: number;
  sort_order: number;
  exercises: {
    id: string;
    name: string;
    hauptzweck: string;
    min_players: number;
    max_players: number;
  } | null;
};

export default async function TrainingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: training }, { data: exercises }, canWrite] = await Promise.all([
    supabase
      .from("trainings")
      .select(
        "id, training_date, notes, training_exercises(duration_minutes, sort_order, exercises(id, name, hauptzweck, min_players, max_players))",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("exercises")
      .select("id, name, hauptzweck, min_players, max_players")
      .order("name"),
    isTrainer(),
  ]);

  if (!training) notFound();

  const items = (
    (training.training_exercises ?? []) as unknown as TrainingExerciseRow[]
  )
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  const totalMinutes = items.reduce((sum, i) => sum + i.duration_minutes, 0);

  const update = updateTraining.bind(null, id);
  const remove = deleteTrainingAction.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold">Training – {training.training_date}</h1>
      <p className="mb-6 text-sm text-zinc-500">Gesamtdauer: {totalMinutes} min</p>

      {!canWrite && (
        <p className="mb-6 text-sm text-zinc-500">
          Du hast Nur-Lese-Zugriff. Ändern können nur Trainer.
        </p>
      )}

      {canWrite ? (
        <>
          <TrainingBuilder
            exercises={exercises ?? []}
            action={update}
            initialDate={training.training_date}
            initialNotes={training.notes ?? undefined}
            initialRows={items
              .filter((i) => i.exercises)
              .map((i) => ({ exerciseId: i.exercises!.id, duration: i.duration_minutes }))}
            submitLabel="Änderungen speichern"
          />
          <form action={remove} className="mt-6">
            <button
              type="submit"
              className="text-sm text-red-600 hover:underline dark:text-red-400"
            >
              Training löschen
            </button>
          </form>
        </>
      ) : (
        <>
          {training.notes && <p className="mb-4 text-sm">{training.notes}</p>}
          <ol className="space-y-2 text-sm">
            {items.map((item, index) => (
              <li
                key={index}
                className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <span className="font-medium">
                  {item.exercises?.name ?? "Übung entfernt"}
                </span>{" "}
                <span className="text-zinc-500">– {item.duration_minutes} min</span>
                {item.exercises && (
                  <p className="text-xs text-zinc-500">{item.exercises.hauptzweck}</p>
                )}
              </li>
            ))}
            {!items.length && <li className="text-zinc-500">Noch keine Übungen geplant.</li>}
          </ol>
        </>
      )}
    </div>
  );
}
