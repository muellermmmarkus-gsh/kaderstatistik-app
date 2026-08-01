import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteEvent } from "./actions";
import CreateEventForm from "./CreateEventForm";

const typeLabels: Record<string, string> = {
  training: "Training",
  game: "Spiel",
  event: "Event",
};

type EventRow = {
  id: string;
  type: string;
  event_date: string;
  opponent: string | null;
  label: string | null;
  season: string;
  trainer_attendance: {
    present: boolean;
    trainers: { first_name: string; last_name: string } | null;
  }[];
};

export default async function EventsPage() {
  const supabase = await createClient();
  const [{ data: eventsData }, { data: seasons }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, type, event_date, opponent, label, season, trainer_attendance(present, trainers(first_name, last_name))",
      )
      .order("event_date", { ascending: false }),
    supabase
      .from("seasons")
      .select("name, is_default")
      .order("name", { ascending: false }),
  ]);

  const events = eventsData as EventRow[] | null;

  const defaultSeason =
    seasons?.find((s) => s.is_default)?.name ?? seasons?.[0]?.name;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Termine</h1>

      {!seasons?.length ? (
        <p className="mb-8 text-sm text-zinc-500">
          Bevor du Termine anlegen kannst, richte unter{" "}
          <Link href="/seasons" className="underline">
            Saisonverwaltung
          </Link>{" "}
          mindestens eine Saison ein.
        </p>
      ) : (
        <CreateEventForm seasons={seasons} defaultSeason={defaultSeason} />
      )}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2">Datum</th>
            <th className="py-2">Art</th>
            <th className="py-2">Gegner</th>
            <th className="py-2">Event</th>
            <th className="py-2">Trainer</th>
            <th className="py-2">Saison</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {events?.map((event) => {
            const remove = deleteEvent.bind(null, event.id);
            const confirmedTrainers = event.trainer_attendance
              .filter((a) => a.present && a.trainers)
              .map((a) => `${a.trainers!.first_name} ${a.trainers!.last_name}`)
              .join(", ");
            return (
              <tr
                key={event.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2">
                  <Link href={`/events/${event.id}`} className="hover:underline">
                    {event.event_date}
                  </Link>
                </td>
                <td className="py-2">{typeLabels[event.type]}</td>
                <td className="py-2 text-zinc-500">{event.opponent ?? "–"}</td>
                <td className="py-2 text-zinc-500">{event.label ?? "–"}</td>
                <td className="py-2 text-zinc-500">{confirmedTrainers || "–"}</td>
                <td className="py-2 text-zinc-500">{event.season}</td>
                <td className="py-2 text-right">
                  <form action={remove}>
                    <button
                      type="submit"
                      className="text-zinc-600 hover:underline dark:text-zinc-400"
                    >
                      löschen
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
          {!events?.length && (
            <tr>
              <td colSpan={7} className="py-4 text-zinc-500">
                Noch keine Termine angelegt.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
