import Link from "next/link";
import { Fragment } from "react";
import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { deleteEvent } from "./actions";
import CreateEventForm from "./CreateEventForm";
import DeleteEventButton from "./DeleteEventButton";
import BackButton from "@/components/BackButton";
import { eventTypeLabel } from "@/lib/eventTypes";

type EventRow = {
  id: string;
  type: string;
  event_date: string;
  opponent: string | null;
  event_time: string | null;
  location: string | null;
  season: string;
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; season?: string }>;
}) {
  const { type: filterType, season: filterSeason } = await searchParams;
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

  const supabase = await createClient();
  let eventsQuery = supabase
    .from("events")
    .select("id, type, event_date, opponent, event_time, location, season")
    .is("deleted_at", null)
    // Neueste bzw. am weitesten in der Zukunft liegende Termine oben.
    .order("event_date", { ascending: false })
    .order("event_time", { ascending: false, nullsFirst: true });
  if (filterType) eventsQuery = eventsQuery.eq("type", filterType);
  if (filterSeason) eventsQuery = eventsQuery.eq("season", filterSeason);

  const [{ data: eventsData }, { data: seasons }, { data: eventTypes }, { data: trainingsData }, canWrite] =
    await Promise.all([
      eventsQuery,
      supabase
        .from("seasons")
        .select("name, is_default")
        .order("name", { ascending: false }),
      supabase.from("event_types").select("key, label").order("sort_order"),
      supabase.from("trainings").select("event_id, focus").not("event_id", "is", null),
      isTrainer(),
    ]);

  const events = eventsData as EventRow[] | null;
  const focusByEvent = new Map(
    (trainingsData ?? []).map((t) => [t.event_id as string, t.focus as string | null]),
  );
  const hasActiveFilters = !!(filterType || filterSeason);
  const typeLabels = new Map((eventTypes ?? []).map((t) => [t.key, t.label]));
  // "unassigned" ist ein internes Fangnetz fuer Termine, deren Terminart
  // geloescht wurde - nicht zur Auswahl beim Anlegen eines neuen Termins.
  const creatableEventTypes = (eventTypes ?? []).filter((t) => t.key !== "unassigned");

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
            eventTypes={creatableEventTypes}
          />
        ))}

      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="filterType">
            Art
          </label>
          <select
            id="filterType"
            name="type"
            defaultValue={filterType ?? ""}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Alle</option>
            {(eventTypes ?? []).map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="filterSeason">
            Saison
          </label>
          <select
            id="filterSeason"
            name="season"
            defaultValue={filterSeason ?? ""}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Alle</option>
            {(seasons ?? []).map((s) => (
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
          Filtern
        </button>
        {hasActiveFilters && (
          <Link
            href="/events"
            className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
          >
            Filter löschen
          </Link>
        )}
      </form>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2 pr-8">Datum</th>
            <th className="py-2">Art</th>
            <th className="py-2">Gegner</th>
            <th className="py-2">Uhrzeit</th>
            <th className="py-2">Ort</th>
            <th className="py-2">Schwerpunkt</th>
            <th className="py-2">Saison</th>
            {canWrite && <th className="py-2" />}
          </tr>
        </thead>
        <tbody>
          {events?.map((event, index) => {
            const remove = deleteEvent.bind(null, event.id);
            const isPast = event.event_date < today;
            // Dezente Trennlinie vor dem ersten vergangenen Termin
            const showDivider = isPast && (index === 0 || events[index - 1].event_date >= today);
            return (
              <Fragment key={event.id}>
              {showDivider && (
                <tr aria-hidden="true">
                  <td colSpan={canWrite ? 8 : 7} className="pb-1 pt-5">
                    <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
                      <span className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
                      Vergangene Termine
                      <span className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
                    </div>
                  </td>
                </tr>
              )}
              <tr
                className={`border-b border-zinc-100 dark:border-zinc-900 ${isPast ? "text-zinc-500 dark:text-zinc-400" : ""}`}
              >
                <td className="py-2 pr-8">
                  <Link href={`/events/${event.id}`} className="hover:underline">
                    {event.event_date}
                  </Link>
                </td>
                <td className="py-2">{eventTypeLabel(typeLabels, event.type)}</td>
                <td className="py-2 text-zinc-500">{event.opponent ?? "–"}</td>
                <td className="py-2 text-zinc-500">
                  {event.event_time ? event.event_time.slice(0, 5) : "–"}
                </td>
                <td className="py-2 text-zinc-500">{event.location ?? "–"}</td>
                <td className="py-2 text-zinc-500">{focusByEvent.get(event.id) ?? "–"}</td>
                <td className="py-2 text-zinc-500">{event.season}</td>
                {canWrite && (
                  <td className="py-2 text-right">
                    <DeleteEventButton
                      action={remove}
                      className="text-zinc-600 hover:underline dark:text-zinc-400"
                    />
                  </td>
                )}
              </tr>
              </Fragment>
            );
          })}
          {!events?.length && (
            <tr>
              <td colSpan={canWrite ? 8 : 7} className="py-4 text-zinc-500">
                Noch keine Termine angelegt.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
