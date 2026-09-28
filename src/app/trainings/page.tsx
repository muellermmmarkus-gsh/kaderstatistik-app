import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { deleteEvent } from "@/app/events/actions";
import BackButton from "@/components/BackButton";
import DeleteConfirmButton from "@/components/DeleteConfirmButton";

type EventRow = { id: string; event_date: string };
type TrainingRow = {
  event_id: string;
  focus: string | null;
  training_exercises: { duration_minutes: number; block: number }[];
};

// Parallele Uebungen im selben Trainingsblock (z.B. Gruppe A/B) haben je
// eine eigene Zeile, aber dieselbe Blockdauer - die Gesamtdauer zaehlt
// jeden Block nur einmal, sonst wuerde sie bei parallelen Bloecken zu hoch
// ausfallen (siehe auch die identische Logik in trainings/[id]/page.tsx).
function totalMinutesOf(exercises: { duration_minutes: number; block: number }[]): number {
  const durationByBlock = new Map<number, number>();
  for (const ex of exercises) {
    if (!durationByBlock.has(ex.block)) durationByBlock.set(ex.block, ex.duration_minutes);
  }
  return [...durationByBlock.values()].reduce((sum, d) => sum + d, 0);
}

export default async function TrainingsPage() {
  const supabase = await createClient();
  const [{ data: eventsData }, { data: trainingsData }, canWrite] = await Promise.all([
    supabase
      .from("events")
      .select("id, event_date")
      .eq("type", "training")
      .is("deleted_at", null)
      .order("event_date", { ascending: false }),
    supabase
      .from("trainings")
      .select("event_id, focus, training_exercises(duration_minutes, block)")
      .not("event_id", "is", null),
    isTrainer(),
  ]);

  const events = eventsData as EventRow[] | null;
  const trainings = trainingsData as unknown as TrainingRow[] | null;
  const trainingByEvent = new Map((trainings ?? []).map((t) => [t.event_id, t]));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <h1 className="mb-2 text-xl font-semibold">Trainingsplanung</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Neue Trainings werden unter{" "}
        <Link href="/events" className="underline">
          Termine
        </Link>{" "}
        angelegt. Hier planst du die Übungen für ein bereits angelegtes
        Training – auf ein Training klicken, um zur Detailplanung zu kommen.
      </p>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2">Datum</th>
            <th className="py-2">Schwerpunkt</th>
            <th className="py-2">Übungen</th>
            <th className="py-2">Dauer gesamt</th>
            {canWrite && <th className="py-2" />}
          </tr>
        </thead>
        <tbody>
          {events?.map((event) => {
            const training = trainingByEvent.get(event.id);
            const exerciseCount = training?.training_exercises.length ?? 0;
            const totalMinutes = totalMinutesOf(training?.training_exercises ?? []);
            const isFuture = event.event_date > today;
            const remove = deleteEvent.bind(null, event.id);
            return (
              <tr
                key={event.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2">
                  <Link href={`/trainings/${event.id}`} className="hover:underline">
                    {event.event_date}
                  </Link>
                </td>
                <td className="py-2 text-zinc-500">{training?.focus || "–"}</td>
                <td className="py-2 text-zinc-500">{exerciseCount}</td>
                <td className="py-2 text-zinc-500">{totalMinutes} min</td>
                {canWrite && (
                  <td className="py-2 text-right">
                    {isFuture ? (
                      <form action={remove}>
                        <DeleteConfirmButton
                          message={`Soll das Training vom ${event.event_date} wirklich gelöscht werden? Trainingsplan und erfasste Anwesenheiten werden unwiderruflich mitgelöscht.`}
                          triggerLabel="löschen"
                          confirmLabel="Termin löschen"
                          triggerClassName="text-zinc-600 hover:underline dark:text-zinc-400"
                        />
                      </form>
                    ) : (
                      <span
                        className="text-xs text-zinc-400"
                        title="Vergangene Trainingstermine können nicht gelöscht werden."
                      >
                        –
                      </span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {!events?.length && (
            <tr>
              <td colSpan={canWrite ? 5 : 4} className="py-4 text-zinc-500">
                Noch keine Trainings angelegt. Lege unter{" "}
                <Link href="/events" className="underline">
                  Termine
                </Link>{" "}
                einen Termin vom Typ Training an.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
