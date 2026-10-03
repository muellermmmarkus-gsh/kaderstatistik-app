import { isTrainer } from "@/lib/supabase/profile";
import ExercisesTable from "@/app/exercises/ExercisesTable";
import BackButton from "@/components/BackButton";
import SavedQueryNotice from "@/components/SavedQueryNotice";
import { loadExercises } from "@/app/exercises/loadExercises";

export default async function ExerciseDatabasePage() {
  const [exercises, canWrite] = await Promise.all([loadExercises("all"), isTrainer()]);
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
      </p>

      <ExercisesTable exercises={exercises} canWrite={canWrite} showTeamToggle />
    </div>
  );
}
