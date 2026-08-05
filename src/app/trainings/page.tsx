import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { deleteTraining } from "./actions";

type TrainingRow = {
  id: string;
  training_date: string;
  training_exercises: { duration_minutes: number }[];
};

export default async function TrainingsPage() {
  const supabase = await createClient();
  const [{ data: trainingsData }, canWrite] = await Promise.all([
    supabase
      .from("trainings")
      .select("id, training_date, training_exercises(duration_minutes)")
      .order("training_date", { ascending: false }),
    isTrainer(),
  ]);

  const trainings = trainingsData as TrainingRow[] | null;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Trainingsplanung</h1>
        {canWrite && (
          <Link
            href="/trainings/new"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Neues Training
          </Link>
        )}
      </div>

      {!canWrite && (
        <p className="mb-6 text-sm text-zinc-500">
          Du hast Nur-Lese-Zugriff. Trainings planen können nur Trainer.
        </p>
      )}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2">Datum</th>
            <th className="py-2">Übungen</th>
            <th className="py-2">Dauer gesamt</th>
            {canWrite && <th className="py-2" />}
          </tr>
        </thead>
        <tbody>
          {trainings?.map((training) => {
            const totalMinutes = training.training_exercises.reduce(
              (sum, te) => sum + te.duration_minutes,
              0,
            );
            const remove = deleteTraining.bind(null, training.id);
            return (
              <tr
                key={training.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2">
                  <Link href={`/trainings/${training.id}`} className="hover:underline">
                    {training.training_date}
                  </Link>
                </td>
                <td className="py-2 text-zinc-500">
                  {training.training_exercises.length}
                </td>
                <td className="py-2 text-zinc-500">{totalMinutes} min</td>
                {canWrite && (
                  <td className="py-2 text-right">
                    <form action={remove}>
                      <button
                        type="submit"
                        className="text-zinc-600 hover:underline dark:text-zinc-400"
                      >
                        löschen
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            );
          })}
          {!trainings?.length && (
            <tr>
              <td colSpan={canWrite ? 4 : 3} className="py-4 text-zinc-500">
                Noch keine Trainings geplant.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
