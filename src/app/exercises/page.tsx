import Link from "next/link";
import { getCurrentProfile, isTrainer } from "@/lib/supabase/profile";
import ExercisesTable from "./ExercisesTable";
import BackButton from "@/components/BackButton";
import SavedQueryNotice from "@/components/SavedQueryNotice";
import { loadExercises } from "./loadExercises";
import { canEditExercise } from "./permissions";

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [rows, canWrite, profile, { error }] = await Promise.all([
    loadExercises("team"),
    isTrainer(),
    getCurrentProfile(),
    searchParams,
  ]);
  const exercises = rows.map((e) => ({ ...e, editable: canEditExercise(profile, e.createdByTeamId) }));

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <SavedQueryNotice />
      <div className="mb-2 flex items-center justify-between">
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
      <p className="mb-6 text-sm text-zinc-500">
        Die Übungen deines Teams. Weitere Übungen anderer Teams holst du dir
        über die{" "}
        <Link href="/exercise-database" className="underline">
          Übungsdatenbank
        </Link>
        . Neu angelegte Übungen landen automatisch auch dort.
        {!profile?.isAdmin &&
          " Ändern und löschen kannst du die Übungen, die dein Team erstellt hat – für eine eigene Variante einer anderen Übung „Kopie erst.“ nutzen."}
      </p>
      {error && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      <ExercisesTable exercises={exercises} canWrite={canWrite} returnTo="/exercises" />
    </div>
  );
}
