import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { addAbsence, updateAbsence, deleteAbsence } from "./actions";

type Absence = {
  id: string;
  trainer_id: string;
  reason: string;
  start_date: string;
  end_date: string;
};

export default async function AbsencesPage() {
  const supabase = await createClient();
  const [{ data: trainers }, { data: absences }, canWrite] = await Promise.all([
    supabase
      .from("trainers")
      .select("id, first_name, last_name")
      .eq("active", true)
      .order("last_name"),
    supabase
      .from("trainer_absences")
      .select("id, trainer_id, reason, start_date, end_date")
      .order("start_date"),
    isTrainer(),
  ]);

  const absencesByTrainer = new Map<string, Absence[]>();
  for (const absence of (absences as Absence[] | null) ?? []) {
    const list = absencesByTrainer.get(absence.trainer_id) ?? [];
    list.push(absence);
    absencesByTrainer.set(absence.trainer_id, list);
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="mb-2 text-xl font-semibold">Abwesenheiten</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Zeiträume eintragen, in denen ein Trainer nicht verfügbar ist. Die
        Abwesenheiten erscheinen automatisch im Kalender.
        {!canWrite && " Du hast Nur-Lese-Zugriff, Änderungen können nur Trainer vornehmen."}
      </p>

      {!trainers?.length && (
        <p className="text-zinc-500">Noch keine Trainer angelegt.</p>
      )}

      {trainers?.map((trainer) => {
        const trainerAbsences = absencesByTrainer.get(trainer.id) ?? [];
        const newFormId = `new-${trainer.id}`;

        return (
          <section key={trainer.id} className="mb-8">
            <h2 className="mb-3 font-medium">
              {trainer.first_name} {trainer.last_name}
            </h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2">Abwesenheit</th>
                  <th className="py-2">Von</th>
                  <th className="py-2">Bis</th>
                  {canWrite && <th className="py-2" />}
                </tr>
              </thead>
              <tbody>
                {trainerAbsences.map((absence) => {
                  const formId = `abs-${absence.id}`;
                  const remove = deleteAbsence.bind(null, absence.id);
                  return (
                    <tr
                      key={absence.id}
                      className="border-b border-zinc-100 dark:border-zinc-900"
                    >
                      <td className="py-2">
                        <select
                          form={formId}
                          name="reason"
                          defaultValue={absence.reason}
                          disabled={!canWrite}
                          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                        >
                          <option value="Abwesenheit">Abwesenheit</option>
                        </select>
                      </td>
                      <td className="py-2">
                        <input
                          form={formId}
                          type="date"
                          name="startDate"
                          required
                          defaultValue={absence.start_date}
                          disabled={!canWrite}
                          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          form={formId}
                          type="date"
                          name="endDate"
                          required
                          defaultValue={absence.end_date}
                          disabled={!canWrite}
                          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                        />
                      </td>
                      {canWrite && (
                        <td className="py-2 text-right whitespace-nowrap">
                          <button
                            form={formId}
                            type="submit"
                            className="mr-3 text-zinc-600 hover:underline dark:text-zinc-400"
                          >
                            ändern
                          </button>
                          <form action={remove} className="inline">
                            <button
                              type="submit"
                              className="text-zinc-600 hover:underline dark:text-zinc-400"
                            >
                              löschen
                            </button>
                          </form>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {canWrite && (
                  <tr>
                    <td className="py-2">
                      <select
                        form={newFormId}
                        name="reason"
                        defaultValue="Abwesenheit"
                        className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <option value="Abwesenheit">Abwesenheit</option>
                      </select>
                    </td>
                    <td className="py-2">
                      <input
                        form={newFormId}
                        type="date"
                        name="startDate"
                        required
                        className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        form={newFormId}
                        type="date"
                        name="endDate"
                        required
                        className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </td>
                    <td className="py-2 text-right">
                      <button
                        form={newFormId}
                        type="submit"
                        className="text-zinc-600 hover:underline dark:text-zinc-400"
                      >
                        speichern
                      </button>
                    </td>
                  </tr>
                )}
                {!trainerAbsences.length && !canWrite && (
                  <tr>
                    <td colSpan={3} className="py-4 text-zinc-500">
                      Keine Abwesenheiten eingetragen.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {canWrite &&
              trainerAbsences.map((absence) => (
                <form
                  key={absence.id}
                  id={`abs-${absence.id}`}
                  action={updateAbsence.bind(null, absence.id)}
                />
              ))}
            {canWrite && (
              <form id={newFormId} action={addAbsence.bind(null, trainer.id)} />
            )}
          </section>
        );
      })}
    </div>
  );
}
