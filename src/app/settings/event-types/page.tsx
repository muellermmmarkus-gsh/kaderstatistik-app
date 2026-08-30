import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { saveEventTypes } from "./actions";
import EventTypeForm from "./EventTypeForm";
import BackButton from "@/components/BackButton";

export default async function EventTypesSettingsPage() {
  const supabase = await createClient();
  const [{ data: types }, canWrite] = await Promise.all([
    supabase.from("event_types").select("key, label").order("sort_order"),
    isTrainer(),
  ]);

  const initialTypes = types ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <h1 className="mb-1 text-lg font-medium text-zinc-500">Termine</h1>
      <h2 className="mb-2 text-xl font-semibold">Art der auswählbaren Termine</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Diese Terminarten stehen unter „Termine“ und im Kalender in der
        Auswahl „Art“ zur Verfügung. Training, Spiel, Turnier und Event
        kannst du hier umbenennen; über „zusätzliche Terminart“ fügst du
        weitere Arten hinzu (diese verhalten sich wie „Event“ und benötigen
        nur eine Bezeichnung, aber keine Trainingsplanung oder Anwesenheit).
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
