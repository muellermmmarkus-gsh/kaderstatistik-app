import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { deleteEvent } from "./actions";
import CreateEventForm from "./CreateEventForm";
import BackButton from "@/components/BackButton";

type EventRow = {
  id: string;
  type: string;
  event_date: string;
  opponent: string | null;
  event_time: string | null;
  location: string | null;
  label: string | null;
  season: string;
  trainer_attendance: {
    confirmed: boolean;
    trainers: { first_name: string; last_name: string } | null;
  }[];
};

export default async function EventsPage() {
  const supabase = await createClient();
  const [{ data: eventsData }, { data: seasons }, { data: eventTypes }, canWrite] =
    await Promise.all([
      supabase
        .from("events")
        .select(
          "id, type, event_date, opponent, event_time, location, label, season, trainer_attendance(confirmed, trainers(first_name, last_name))",
        )
        .order("event_date", { ascending: true }),
      supabase
        .from("seasons")
        .select("name, is_default")
        .order("name", { ascending: false }),
      supabase.from("event_types").select("key, label").order("sort_order"),
      isTrainer(),
    ]);

  const events = eventsData as EventRow[] | null;
  const today = new Date().toISOString().slice(0, 10);
  const typeLabels = new Map((eventTypes ?? []).map((t) => [t.key, t.label]));

  const defaultSeason =
    seasons?.find((s) => s.is_default)?.name ?? seasons?.[0]?.name;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <h1 className="mb-6 text-xl font-semibold">Termine</h1>

      {!canWrite && (
        <p className="mb-6 text-sm text-zinc-500">
          Du hast Nur-Lese-Zugriff. Termine anlegen oder löschen können nur
          Trainer.
        </p>
      )}

      {canWrite &&
        (!seasons?.length ? (
          <p className="mb-8 text-sm text-zinc-500">
            Bevor du Termine anlegen kannst, richte unter{" "}
            <Link href="/seasons" className="underline">
              Saisonverwaltung
            </Link>{" "}
            mindestens eine Saison ein.
          </p>
        ) : (
          <CreateEventForm
            seasons={seasons}
            defaultSeason={defaultSeason}
            eventTypes={eventTypes ?? []}
          />
        ))}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2">Datum</th>
            <th className="py-2">Art</th>
            <th className="py-2">Gegner</th>
            <th className="py-2">Uhrzeit</th>
            <th className="py-2">Ort</th>
            <th className="py-2">Event</th>
            <th className="py-2">Trainer (zugesagt)</th>
            <th className="py-2">Saison</th>
            {canWrite && <th className="py-2" />}
          </tr>
        </thead>
        <tbody>
          {events?.map((event) => {
            const remove = deleteEvent.bind(null, event.id);
            // Vergangene Trainingstermine (inkl. heute) duerfen nicht
            // geloescht werden, damit Trainingsplaene und bereits erfasste
            // Anwesenheiten erhalten bleiben. Spiele/Events/Turniere sind
            // davon nicht betroffen.
            const canDelete = !(event.type === "training" && event.event_date <= today);
            const confirmedTrainers = event.trainer_attendance
              .filter((a) => a.confirmed && a.trainers)
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
                <td className="py-2">{typeLabels.get(event.type) ?? event.type}</td>
                <td className="py-2 text-zinc-500">{event.opponent ?? "–"}</td>
                <td className="py-2 text-zinc-500">
                  {event.event_time ? event.event_time.slice(0, 5) : "–"}
                </td>
                <td className="py-2 text-zinc-500">{event.location ?? "–"}</td>
                <td className="py-2 text-zinc-500">{event.label ?? "–"}</td>
                <td className="py-2 text-zinc-500">{confirmedTrainers || "–"}</td>
                <td className="py-2 text-zinc-500">{event.season}</td>
                {canWrite && (
                  <td className="py-2 text-right">
                    {canDelete ? (
                      <form action={remove}>
                        <button
                          type="submit"
                          className="text-zinc-600 hover:underline dark:text-zinc-400"
                        >
                          löschen
                        </button>
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
              <td colSpan={canWrite ? 9 : 8} className="py-4 text-zinc-500">
                Noch keine Termine angelegt.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
