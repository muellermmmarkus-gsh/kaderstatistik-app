import { getCurrentProfile, isTrainer } from "@/lib/supabase/profile";
import ExercisesTable from "@/app/exercises/ExercisesTable";
import BackButton from "@/components/BackButton";
import SavedQueryNotice from "@/components/SavedQueryNotice";
import { loadExercises } from "@/app/exercises/loadExercises";
import { canEditExercise } from "@/app/exercises/permissions";

export default async function ExerciseDatabasePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [rows, canWrite, profile, { error }] = await Promise.all([
    loadExercises("all"),
    isTrainer(),
    getCurrentProfile(),
    searchParams,
  ]);
  const exercises = rows.map((e) => ({ ...e, editable: canEditExercise(profile, e.createdByTeamId) }));
  const activeCount = exercises.filter((e) => e.activeInTeam).length;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <SavedQueryNotice />
      <h1 className="mb-2 text-xl font-semibold">Übungsdatenbank</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Alle Übungen aller Teams, die die App nutzen ({exercises.length} Übungen,
        davon {activeCount} in deinem Team aktiv). Mit „In Team aktiv“ legst
        du fest, welche Übungen unter „Übungen“ und in der Trainingsplanung
        deines Teams erscheinen.
        {profile?.isAdmin
          ? " Als Administrator kannst du alle Übungen ändern und löschen – das gilt für alle Teams."
          : " Ändern und löschen kannst du nur Übungen, die dein Team erstellt hat; Änderungen gelten auch für Teams, die sie übernommen haben."}
      </p>
      {error && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      <ExercisesTable
        exercises={exercises}
        canWrite={canWrite}
        returnTo="/exercise-database"
        showTeamToggle
      />
    </div>
  );
}
