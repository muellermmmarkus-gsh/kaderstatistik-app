import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { saveTrainingPlan } from "./actions";
import TrainingBuilder from "../TrainingBuilder";
import BackButton from "@/components/BackButton";

type ExerciseOption = {
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
  source_url: string | null;
  fields: { name: string; length_m: number; width_m: number } | null;
};

type TrainingExerciseRow = {
  duration_minutes: number;
  sort_order: number;
  block: number;
  training_exercise_groups: { group_label: string }[];
  exercises: {
    id: string;
    name: string;
    hauptzweck: string;
    min_players: number;
    max_players: number;
    image_url: string | null;
  } | null;
};

type PlayerOption = { id: string; first_name: string; last_name: string };

export default async function TrainingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: event },
    { data: training },
    { data: exercises },
    { data: players },
    { data: focuses },
    { data: latestGrades },
    canWrite,
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id, event_date, season")
      .eq("id", id)
      .eq("type", "training")
      .maybeSingle(),
    supabase
      .from("trainings")
      .select(
        "focus, notes, training_exercises(duration_minutes, sort_order, block, training_exercise_groups(group_label), exercises(id, name, hauptzweck, min_players, max_players, image_url)), training_player_groups(player_id, group_label)",
      )
      .eq("event_id", id)
      .maybeSingle(),
    supabase
      .from("exercises")
      .select(
        "id, name, hauptzweck, nebenzweck, min_players, max_players, small_goals, mini_goals, category, image_url, source_url, fields(name, length_m, width_m)",
      )
      .order("name"),
    supabase
      .from("players")
      .select("id, first_name, last_name")
      .eq("active", true)
      .order("last_name"),
    supabase.from("exercise_focuses").select("label").order("sort_order"),
    supabase.from("performance_latest").select("player_id, focus, grade"),
    isTrainer(),
  ]);

  if (!event) notFound();

  const exerciseOptions = (exercises ?? []) as unknown as ExerciseOption[];
  const playerOptions = (players ?? []) as PlayerOption[];
  const focusLabels = (focuses ?? []).map((f) => f.label);

  // Schwerpunkte, absteigend nach Dringlichkeit (schwaechste Durchschnittsnote
  // zuerst) sortiert - Grundlage fuer den "KI-Vorschlag" im Trainingsbuilder.
  // Noten folgen dem Schulnotensystem (1 = sehr gut, 6 = ungenuegend), daher
  // ist eine hohe Durchschnittsnote gleichbedeutend mit hohem Trainingsbedarf.
  const activePlayerIds = new Set(playerOptions.map((p) => p.id));
  const gradeSums = new Map<string, { sum: number; count: number }>();
  for (const g of latestGrades ?? []) {
    if (!activePlayerIds.has(g.player_id)) continue;
    const entry = gradeSums.get(g.focus) ?? { sum: 0, count: 0 };
    entry.sum += g.grade;
    entry.count += 1;
    gradeSums.set(g.focus, entry);
  }
  const rankedFocuses = [...gradeSums.entries()]
    .sort((a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count)
    .map(([focus]) => focus);
  const focusPriority = [
    ...rankedFocuses,
    ...focusLabels.filter((f) => !gradeSums.has(f)),
  ];

  const items = (
    (training?.training_exercises ?? []) as unknown as TrainingExerciseRow[]
  )
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  const durationByBlock = new Map<number, number>();
  for (const item of items) {
    if (!durationByBlock.has(item.block)) durationByBlock.set(item.block, item.duration_minutes);
  }
  const totalMinutes = [...durationByBlock.values()].reduce((sum, d) => sum + d, 0);
  const initialPlayerGroups = (
    (training as unknown as { training_player_groups?: { player_id: string; group_label: string }[] } | null)
      ?.training_player_groups ?? []
  ).map((pg) => ({ playerId: pg.player_id, group: pg.group_label }));

  const save = saveTrainingPlan.bind(null, id);

  // TrainingBuilder haelt seinen Zustand in useState, das bei einem erneuten
  // Server-Render mit neuen initialRows/initialFocus NICHT automatisch
  // zurueckgesetzt wird (React-useState-Initializer laeuft nur beim Mount).
  // Ohne diesen Key blieb nach dem Speichern kurzzeitig der alte
  // Client-Zustand sichtbar, bis ein manueller Reload die Komponente neu
  // mountete. Der Key wird aus den gespeicherten Daten abgeleitet, damit
  // TrainingBuilder nach jedem erfolgreichen Speichern remountet und die
  // frisch geladenen Werte uebernimmt.
  const builderKey = JSON.stringify({
    focus: training?.focus ?? null,
    notes: training?.notes ?? null,
    players: initialPlayerGroups,
    items: items
      .filter((i) => i.exercises)
      .map((i) => ({
        id: i.exercises!.id,
        duration: i.duration_minutes,
        block: i.block,
        groups: i.training_exercise_groups.map((g) => g.group_label),
      })),
  });

  return (
    <div className="w-full max-w-6xl flex-1 px-4 py-8">
      {!canWrite && <BackButton href="/trainings" />}
      <h1 className="mb-1 text-xl font-semibold">Training – {event.event_date}</h1>
      <p className="mb-4 text-sm text-zinc-500">Gesamtdauer: {totalMinutes} min</p>

      <Link
        href={`/events/${event.id}`}
        className="mb-6 inline-block rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
      >
        Zum Termin (Anwesenheit eintragen)
      </Link>

      {!canWrite && (
        <p className="mb-6 text-sm text-zinc-500">
          Du hast Nur-Lese-Zugriff. Ändern können nur Trainer.
        </p>
      )}

      {canWrite ? (
        <TrainingBuilder
          key={builderKey}
          backHref="/trainings"
          exercises={exerciseOptions}
          players={playerOptions}
          focuses={focusLabels}
          focusPriority={focusPriority}
          action={save}
          initialFocus={training?.focus ?? undefined}
          initialNotes={training?.notes ?? undefined}
          initialRows={items
            .filter((i) => i.exercises)
            .map((i) => ({
              exerciseId: i.exercises!.id,
              duration: i.duration_minutes,
              block: i.block,
              groups: i.training_exercise_groups.map((g) => g.group_label),
            }))}
          initialPlayerGroups={initialPlayerGroups}
          submitLabel="Änderungen speichern"
        />
      ) : (
        <>
          {training?.focus && (
            <p className="mb-2 text-sm">
              <span className="font-medium">Schwerpunkt:</span> {training.focus}
            </p>
          )}
          {training?.notes && <p className="mb-4 text-sm">{training.notes}</p>}
          <ol className="space-y-2 text-sm">
            {items.map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                {item.exercises?.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- externe Supabase-Storage-URL
                  <img
                    src={item.exercises.image_url}
                    alt=""
                    className="h-12 w-12 rounded border border-zinc-300 object-cover dark:border-zinc-700"
                  />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded border border-dashed border-zinc-300 dark:border-zinc-700" />
                )}
                <div>
                  <span className="font-medium">
                    {item.exercises?.name ?? "Übung entfernt"}
                  </span>{" "}
                  <span className="text-zinc-500">– {item.duration_minutes} min</span>
                  {item.exercises && (
                    <p className="text-xs text-zinc-500">{item.exercises.hauptzweck}</p>
                  )}
                </div>
              </li>
            ))}
            {!items.length && <li className="text-zinc-500">Noch keine Übungen geplant.</li>}
          </ol>
        </>
      )}
    </div>
  );
}
