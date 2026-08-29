import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type ExerciseRow = { id: string; name: string };
type EventRow = { id: string; event_date: string };
type TrainingRow = { event_id: string; training_exercises: { exercise_id: string }[] };

export default async function ExerciseHistoryPage() {
  const supabase = await createClient();
  const [{ data: exercisesData }, { data: eventsData }, { data: trainingsData }] =
    await Promise.all([
      supabase.from("exercises").select("id, name").order("name"),
      supabase
        .from("events")
        .select("id, event_date")
        .eq("type", "training")
        .order("event_date", { ascending: true }),
      supabase
        .from("trainings")
        .select("event_id, training_exercises(exercise_id)")
        .not("event_id", "is", null),
    ]);

  const exercises = (exercisesData as ExerciseRow[] | null) ?? [];
  const events = (eventsData as EventRow[] | null) ?? [];
  const trainings = trainingsData as unknown as TrainingRow[] | null;

  const exerciseIdsByEvent = new Map(
    (trainings ?? []).map((t) => [
      t.event_id,
      new Set(t.training_exercises.map((te) => te.exercise_id)),
    ]),
  );

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="mb-2 text-xl font-semibold">Übungshistorie</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Zeigt, in welchen Trainingseinheiten aus dem Kalender eine Übung unter
        Trainingsplanung eingeplant wurde.
      </p>

      {!exercises.length ? (
        <p className="text-sm text-zinc-500">Noch keine Übungen angelegt.</p>
      ) : !events.length ? (
        <p className="text-sm text-zinc-500">
          Noch keine Trainingstermine im Kalender angelegt.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2 pr-2">Übung</th>
                <th className="px-2 py-2 text-center">Gesamt</th>
                {events.map((event) => (
                  <th key={event.id} className="px-2 py-2 text-center">
                    <Link href={`/trainings/${event.id}`} className="hover:underline">
                      {event.event_date}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exercises.map((exercise) => {
                const total = events.reduce(
                  (sum, event) =>
                    sum + (exerciseIdsByEvent.get(event.id)?.has(exercise.id) ? 1 : 0),
                  0,
                );
                return (
                  <tr
                    key={exercise.id}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="whitespace-nowrap py-2 pr-2">
                      <Link href={`/exercises/${exercise.id}`} className="hover:underline">
                        {exercise.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-center font-medium">{total}</td>
                    {events.map((event) => (
                      <td key={event.id} className="px-2 py-2 text-center">
                        {exerciseIdsByEvent.get(event.id)?.has(exercise.id) ? "X" : ""}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
