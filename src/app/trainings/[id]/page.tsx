import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { saveTrainingPlan } from "./actions";
import TrainingBuilder from "../TrainingBuilder";

type ExerciseOption = {
  id: string;
  name: string;
  hauptzweck: string;
  min_players: number;
  max_players: number;
  category: string;
  image_url: string | null;
  fields: { name: string; length_m: number; width_m: number } | null;
};

type TrainingExerciseRow = {
  duration_minutes: number;
  sort_order: number;
  exercises: {
    id: string;
    name: string;
    hauptzweck: string;
    min_players: number;
    max_players: number;
    image_url: string | null;
  } | null;
};

export default async function TrainingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: event }, { data: training }, { data: exercises }, canWrite] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, event_date, season")
        .eq("id", id)
        .eq("type", "training")
        .maybeSingle(),
      supabase
        .from("trainings")
        .select(
          "focus, notes, training_exercises(duration_minutes, sort_order, exercises(id, name, hauptzweck, min_players, max_players, image_url))",
        )
        .eq("event_id", id)
        .maybeSingle(),
      supabase
        .from("exercises")
        .select(
          "id, name, hauptzweck, min_players, max_players, category, image_url, fields(name, length_m, width_m)",
        )
        .order("name"),
      isTrainer(),
    ]);

  if (!event) notFound();

  const exerciseOptions = (exercises ?? []) as unknown as ExerciseOption[];

  const items = (
    (training?.training_exercises ?? []) as unknown as TrainingExerciseRow[]
  )
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  const totalMinutes = items.reduce((sum, i) => sum + i.duration_minutes, 0);

  const save = saveTrainingPlan.bind(null, id);

  return (
    <div className="w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold">Training – {event.event_date}</h1>
      <p className="mb-6 text-sm text-zinc-500">Gesamtdauer: {totalMinutes} min</p>

      {!canWrite && (
        <p className="mb-6 text-sm text-zinc-500">
          Du hast Nur-Lese-Zugriff. Ändern können nur Trainer.
        </p>
      )}

      {canWrite ? (
        <TrainingBuilder
          exercises={exerciseOptions}
          action={save}
          initialFocus={training?.focus ?? undefined}
          initialNotes={training?.notes ?? undefined}
          initialRows={items
            .filter((i) => i.exercises)
            .map((i) => ({ exerciseId: i.exercises!.id, duration: i.duration_minutes }))}
          submitLabel="Änderungen speichern"
        />
      ) : (
        <>
          {training?.focus && (
            <p className="mb-2 text-sm">
              <span className="font-medium">Schwerpunkt:</span> {training.focus}
            </p>
          )}
          {training?.notes && <p className="mb-4 text-sm">{training.notes}</p>}
          <ol className="space-y-2 text-sm">
            {items.map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                {item.exercises?.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- externe Supabase-Storage-URL
                  <img
                    src={item.exercises.image_url}
                    alt=""
                    className="h-12 w-12 rounded border border-zinc-300 object-cover dark:border-zinc-700"
                  />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded border border-dashed border-zinc-300 dark:border-zinc-700" />
                )}
                <div>
                  <span className="font-medium">
                    {item.exercises?.name ?? "Übung entfernt"}
                  </span>{" "}
                  <span className="text-zinc-500">– {item.duration_minutes} min</span>
                  {item.exercises && (
                    <p className="text-xs text-zinc-500">{item.exercises.hauptzweck}</p>
                  )}
                </div>
              </li>
            ))}
            {!items.length && <li className="text-zinc-500">Noch keine Übungen geplant.</li>}
          </ol>
        </>
      )}
    </div>
  );
}
