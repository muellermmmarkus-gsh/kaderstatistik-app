import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { saveEventTypes } from "./actions";
import EventTypeForm from "./EventTypeForm";
import BackButton from "@/components/BackButton";

// "unassigned" ist ein internes Fangnetz fuer Termine, deren Terminart
// geloescht wurde - taucht bewusst nicht in der Verwaltung auf.
const HIDDEN_KEYS = ["unassigned"];

export default async function EventTypesSettingsPage() {
  const supabase = await createClient();
  const [{ data: types }, { data: allEvents }, canWrite] = await Promise.all([
    supabase.from("event_types").select("key, label").order("sort_order"),
    supabase.from("events").select("type"),
    isTrainer(),
  ]);

  const countByType = new Map<string, number>();
  for (const e of allEvents ?? []) {
    countByType.set(e.type, (countByType.get(e.type) ?? 0) + 1);
  }

  const initialTypes = (types ?? [])
    .filter((t) => !HIDDEN_KEYS.includes(t.key))
    .map((t) => ({ ...t, eventCount: countByType.get(t.key) ?? 0 }));

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <h1 className="mb-1 text-lg font-medium text-zinc-500">Termine</h1>
      <h2 className="mb-2 text-xl font-semibold">Art der auswählbaren Termine</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Diese Terminarten stehen unter „Termine“ und im Kalender in der
        Auswahl „Art“ zur Verfügung. Training, Spiel, Turnier und Event
        kannst du hier umbenennen (aber nicht löschen); über „zusätzliche
        Terminart“ fügst du weitere Arten hinzu (diese verhalten sich wie
        „Event“ und benötigen nur eine Bezeichnung, aber keine
        Trainingsplanung oder Anwesenheit) und kannst sie auch wieder
        löschen.
      </p>

      {canWrite ? (
        <EventTypeForm action={saveEventTypes} initialTypes={initialTypes} />
      ) : (
        <>
          <p className="mb-4 text-sm text-zinc-500">
            Du hast Nur-Lese-Zugriff. Ändern können nur Trainer.
          </p>
          <ul className="space-y-1 text-sm">
            {initialTypes.map((t) => (
              <li key={t.key}>{t.label}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
