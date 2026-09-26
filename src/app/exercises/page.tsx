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
  const [
    { data: exercisesData },
    { data: trainingsData },
    { data: seasons },
    { data: trainingEvents },
    canWrite,
  ] = await Promise.all([
    supabase
      .from("exercises")
      .select(
        "id, name, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, image_url, created_at, fields(name)",
      )
      .order("name"),
    supabase
      .from("trainings")
      .select("event_id, training_exercises(exercise_id)")
      .not("event_id", "is", null),
    supabase
      .from("seasons")
      .select("name, is_default")
      .order("name", { ascending: false }),
    supabase
      .from("events")
      .select("id, season")
      .eq("type", "training")
      .is("deleted_at", null),
    isTrainer(),
  ]);

  // Laufende Saison wie bei den Terminen: als Standard markierte Saison,
  // sonst die zuletzt angelegte.
  const currentSeason = seasons?.find((s) => s.is_default)?.name ?? seasons?.[0]?.name;
  const currentSeasonEventIds = new Set(
    (trainingEvents ?? []).filter((e) => e.season === currentSeason).map((e) => e.id as string),
  );

  // Wie oft eine Uebung in der laufenden Saison schon eingeplant wurde
  // (gezaehlt wie in der Uebungshistorie: je Trainingstermin einmal).
  const seasonCount = new Map<string, number>();
  for (const training of (trainingsData ?? []) as unknown as {
    event_id: string;
    training_exercises: { exercise_id: string }[];
  }[]) {
    if (!currentSeasonEventIds.has(training.event_id)) continue;
    for (const id of new Set(training.training_exercises.map((te) => te.exercise_id))) {
      seasonCount.set(id, (seasonCount.get(id) ?? 0) + 1);
    }
  }

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
  ).map((exercise) => ({ ...exercise, seasonCount: seasonCount.get(exercise.id) ?? 0 }));

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
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
