import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/BackButton";

type EventRow = { id: string; event_date: string };
type TrainingRow = {
  event_id: string;
  focus: string | null;
  training_exercises: { duration_minutes: number }[];
};

export default async function TrainingsPage() {
  const supabase = await createClient();
  const [{ data: eventsData }, { data: trainingsData }] = await Promise.all([
    supabase
      .from("events")
      .select("id, event_date")
      .eq("type", "training")
      .order("event_date", { ascending: false }),
    supabase
      .from("trainings")
      .select("event_id, focus, training_exercises(duration_minutes)")
      .not("event_id", "is", null),
  ]);

  const events = eventsData as EventRow[] | null;
  const trainings = trainingsData as unknown as TrainingRow[] | null;
  const trainingByEvent = new Map((trainings ?? []).map((t) => [t.event_id, t]));

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
          </tr>
        </thead>
        <tbody>
          {events?.map((event) => {
            const training = trainingByEvent.get(event.id);
            const exerciseCount = training?.training_exercises.length ?? 0;
            const totalMinutes = (training?.training_exercises ?? []).reduce(
              (sum, te) => sum + te.duration_minutes,
              0,
            );
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
              </tr>
            );
          })}
          {!events?.length && (
            <tr>
              <td colSpan={4} className="py-4 text-zinc-500">
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
