import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createEvent, deleteEvent } from "./actions";

export default async function EventsPage() {
  const supabase = await createClient();
  const [{ data: events }, { data: seasons }] = await Promise.all([
    supabase
      .from("events")
      .select("id, type, event_date, opponent, season")
      .order("event_date", { ascending: false }),
    supabase
      .from("seasons")
      .select("name, is_default")
      .order("name", { ascending: false }),
  ]);

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
        <form
          action={createEvent}
          className="mb-8 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="type">
              Art
            </label>
            <select
              id="type"
              name="type"
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="training">Training</option>
              <option value="game">Spiel</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="eventDate">
              Datum
            </label>
            <input
              id="eventDate"
              name="eventDate"
              type="date"
              required
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="opponent">
              Gegner (bei Spiel)
            </label>
            <input
              id="opponent"
              name="opponent"
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="season">
              Saison
            </label>
            <select
              id="season"
              name="season"
              required
              defaultValue={defaultSeason}
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {seasons.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Anlegen
          </button>
        </form>
      )}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2">Datum</th>
            <th className="py-2">Art</th>
            <th className="py-2">Gegner</th>
            <th className="py-2">Saison</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {events?.map((event) => {
            const remove = deleteEvent.bind(null, event.id);
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
                <td className="py-2">
                  {event.type === "training" ? "Training" : "Spiel"}
                </td>
                <td className="py-2 text-zinc-500">{event.opponent ?? "–"}</td>
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
              <td colSpan={5} className="py-4 text-zinc-500">
                Noch keine Termine angelegt.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
