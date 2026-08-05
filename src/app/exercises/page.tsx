import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";

export default async function ExercisesPage() {
  const supabase = await createClient();
  const [{ data: exercises }, canWrite] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, name, hauptzweck, min_players, max_players, small_goals, mini_goals")
      .order("name"),
    isTrainer(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Übungen</h1>
        {canWrite && (
          <Link
            href="/exercises/new"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Neue Übung
          </Link>
        )}
      </div>

      {!canWrite && (
        <p className="mb-6 text-sm text-zinc-500">
          Du hast Nur-Lese-Zugriff. Übungen anlegen oder ändern können nur
          Trainer.
        </p>
      )}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2">Name</th>
            <th className="py-2">Hauptzweck</th>
            <th className="py-2">Spieler</th>
            <th className="py-2">Kleinfeldtore</th>
            <th className="py-2">Minitore</th>
          </tr>
        </thead>
        <tbody>
          {exercises?.map((exercise) => (
            <tr
              key={exercise.id}
              className="border-b border-zinc-100 dark:border-zinc-900"
            >
              <td className="py-2">
                <Link href={`/exercises/${exercise.id}`} className="hover:underline">
                  {exercise.name}
                </Link>
              </td>
              <td className="py-2 text-zinc-500">{exercise.hauptzweck}</td>
              <td className="py-2 text-zinc-500">
                {exercise.min_players}–{exercise.max_players}
              </td>
              <td className="py-2 text-zinc-500">{exercise.small_goals}</td>
              <td className="py-2 text-zinc-500">{exercise.mini_goals}</td>
            </tr>
          ))}
          {!exercises?.length && (
            <tr>
              <td colSpan={5} className="py-4 text-zinc-500">
                Noch keine Übungen angelegt.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
