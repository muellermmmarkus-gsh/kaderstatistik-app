import Link from "next/link";
import { isTrainer } from "@/lib/supabase/profile";
import ExercisesTable from "./ExercisesTable";
import BackButton from "@/components/BackButton";
import SavedQueryNotice from "@/components/SavedQueryNotice";
import { loadExercises } from "./loadExercises";

export default async function ExercisesPage() {
  const [exercises, canWrite] = await Promise.all([loadExercises("team"), isTrainer()]);

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
      </p>

      <ExercisesTable exercises={exercises} canWrite={canWrite} />
    </div>
  );
}
