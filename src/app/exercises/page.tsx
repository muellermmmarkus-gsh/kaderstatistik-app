import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { categoryLabels } from "./categoryLabels";
import BackButton from "@/components/BackButton";
import SavedQueryNotice from "@/components/SavedQueryNotice";

type ExerciseRow = {
  id: string;
  name: string;
  hauptzweck: string;
  min_players: number;
  max_players: number;
  small_goals: number;
  mini_goals: number;
  category: string;
  image_url: string | null;
  fields: { name: string } | null;
};

export default async function ExercisesPage() {
  const supabase = await createClient();
  const [{ data: exercisesData }, canWrite] = await Promise.all([
    supabase
      .from("exercises")
      .select(
        "id, name, hauptzweck, min_players, max_players, small_goals, mini_goals, category, image_url, fields(name)",
      )
      .order("name"),
    isTrainer(),
  ]);

  const exercises = exercisesData as unknown as ExerciseRow[] | null;

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <SavedQueryNotice />
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
            <th className="py-2" />
            <th className="py-2">Name</th>
            <th className="py-2">Kategorie</th>
            <th className="py-2">Fläche</th>
            <th className="py-2">Übungsschwerpunkt 1</th>
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
                {exercise.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- externe Supabase-Storage-URL
                  <img
                    src={exercise.image_url}
                    alt=""
                    className="h-10 w-10 rounded border border-zinc-300 object-cover dark:border-zinc-700"
                  />
                ) : (
                  <div className="h-10 w-10 rounded border border-dashed border-zinc-300 dark:border-zinc-700" />
                )}
              </td>
              <td className="py-2">
                <Link href={`/exercises/${exercise.id}`} className="hover:underline">
                  {exercise.name}
                </Link>
              </td>
              <td className="py-2 text-zinc-500">
                {categoryLabels[exercise.category] ?? exercise.category}
              </td>
              <td className="py-2 text-zinc-500">{exercise.fields?.name ?? "–"}</td>
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
              <td colSpan={8} className="py-4 text-zinc-500">
                Noch keine Übungen angelegt.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
