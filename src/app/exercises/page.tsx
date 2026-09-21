import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import ExercisesTable from "./ExercisesTable";
import BackButton from "@/components/BackButton";
import SavedQueryNotice from "@/components/SavedQueryNotice";

type ExerciseRow = {
  id: string;
  name: string;
  hauptzweck: string;
  nebenzweck: string | null;
  min_players: number;
  max_players: number;
  small_goals: number;
  mini_goals: number;
  category: string;
  image_url: string | null;
  created_at: string;
  fields: { name: string } | null;
};

const COPY_PREFIX = "Kopie von ";

// Ordnet Kopien ("Kopie von <Name>") direkt unter ihrem Original ein, bei
// mehreren Kopien die neueste zuerst. Umbenannte Kopien werden wie jede
// andere Uebung einsortiert.
function placeCopiesUnderOriginals(sorted: ExerciseRow[]): ExerciseRow[] {
  const byName = new Map<string, ExerciseRow>();
  for (const exercise of sorted) {
    if (!byName.has(exercise.name)) byName.set(exercise.name, exercise);
  }

  const copiesOf = new Map<string, ExerciseRow[]>();
  const roots: ExerciseRow[] = [];
  for (const exercise of sorted) {
    const original = exercise.name.startsWith(COPY_PREFIX)
      ? byName.get(exercise.name.slice(COPY_PREFIX.length))
      : undefined;
    if (original) {
      copiesOf.set(original.id, [...(copiesOf.get(original.id) ?? []), exercise]);
    } else {
      roots.push(exercise);
    }
  }

  const result: ExerciseRow[] = [];
  const visit = (exercise: ExerciseRow) => {
    result.push(exercise);
    const copies = [...(copiesOf.get(exercise.id) ?? [])].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
    copies.forEach(visit);
  };
  roots.forEach(visit);
  return result;
}

export default async function ExercisesPage() {
  const supabase = await createClient();
  const [{ data: exercisesData }, { data: trainingsData }, canWrite] = await Promise.all([
    supabase
      .from("exercises")
      .select(
        "id, name, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, image_url, created_at, fields(name)",
      )
      .order("name"),
    supabase
      .from("trainings")
      .select("training_exercises(exercise_id)")
      .not("event_id", "is", null),
    isTrainer(),
  ]);

  // Standardsortierung: absteigend nach Gesamtzahl der Einsätze in der
  // Trainingsplanung (wie in der Übungshistorie), bei Gleichstand alphabetisch.
  const usageCount = new Map<string, number>();
  for (const training of trainingsData ?? []) {
    const uniqueIds = new Set(
      (training.training_exercises as { exercise_id: string }[]).map((te) => te.exercise_id),
    );
    for (const id of uniqueIds) {
      usageCount.set(id, (usageCount.get(id) ?? 0) + 1);
    }
  }

  const exercises = placeCopiesUnderOriginals(
    ((exercisesData as unknown as ExerciseRow[] | null) ?? []).sort(
      (a, b) =>
        (usageCount.get(b.id) ?? 0) - (usageCount.get(a.id) ?? 0) ||
        a.name.localeCompare(b.name, "de"),
    ),
  );

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

      <ExercisesTable exercises={exercises} canWrite={canWrite} />
    </div>
  );
}
