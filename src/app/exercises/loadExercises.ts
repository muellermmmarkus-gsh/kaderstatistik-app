import { createClient } from "@/lib/supabase/server";

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
  // RLS liefert nur die Zeile des eigenen Teams.
  team_exercises: { exercise_id: string }[];
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

/**
 * "team": nur die im eigenen Team aktiven Uebungen (Menue "Uebungen").
 * "all": die komplette teamuebergreifende Uebungsdatenbank.
 */
export async function loadExercises(scope: "team" | "all") {
  const supabase = await createClient();
  const [{ data: exercisesData }, { data: trainingsData }, { data: seasons }, { data: trainingEvents }] =
    await Promise.all([
      supabase
        .from("exercises")
        .select(
          `id, name, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, image_url, created_at, fields(name), team_exercises${scope === "team" ? "!inner" : ""}(exercise_id)`,
        )
        .order("name"),
      supabase
        .from("trainings")
        .select("event_id, training_exercises(exercise_id)")
        .not("event_id", "is", null),
      supabase.from("seasons").select("name, is_default").order("name", { ascending: false }),
      supabase.from("events").select("id, season").eq("type", "training").is("deleted_at", null),
    ]);

  // Laufende Saison wie bei den Terminen: als Standard markierte Saison,
  // sonst die zuletzt angelegte.
  const currentSeason = seasons?.find((s) => s.is_default)?.name ?? seasons?.[0]?.name;
  const currentSeasonEventIds = new Set(
    (trainingEvents ?? []).filter((e) => e.season === currentSeason).map((e) => e.id as string),
  );

  // Einsaetze in der Trainingsplanung des eigenen Teams (je Trainingstermin
  // einmal, wie in der Uebungshistorie): gesamt und in der laufenden Saison.
  const usageCount = new Map<string, number>();
  const seasonCount = new Map<string, number>();
  for (const training of (trainingsData ?? []) as unknown as {
    event_id: string;
    training_exercises: { exercise_id: string }[];
  }[]) {
    const inCurrentSeason = currentSeasonEventIds.has(training.event_id);
    for (const id of new Set(training.training_exercises.map((te) => te.exercise_id))) {
      usageCount.set(id, (usageCount.get(id) ?? 0) + 1);
      if (inCurrentSeason) seasonCount.set(id, (seasonCount.get(id) ?? 0) + 1);
    }
  }

  // Standardsortierung: absteigend nach Gesamtzahl der Einsaetze, bei
  // Gleichstand alphabetisch.
  return placeCopiesUnderOriginals(
    ((exercisesData as unknown as ExerciseRow[] | null) ?? []).sort(
      (a, b) =>
        (usageCount.get(b.id) ?? 0) - (usageCount.get(a.id) ?? 0) ||
        a.name.localeCompare(b.name, "de"),
    ),
  ).map(({ team_exercises, ...exercise }) => ({
    ...exercise,
    seasonCount: seasonCount.get(exercise.id) ?? 0,
    activeInTeam: team_exercises.length > 0,
  }));
}
