import { createClient } from "@/lib/supabase/server";
import { addTrainer, toggleTrainerActive } from "./actions";

export default async function TrainersPage() {
  const supabase = await createClient();
  const { data: trainers } = await supabase
    .from("trainers")
    .select("id, first_name, last_name, active")
    .order("last_name");

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Trainer</h1>

      <form
        action={addTrainer}
        className="mb-8 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="firstName">
            Vorname
          </label>
          <input
            id="firstName"
            name="firstName"
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="lastName">
            Nachname
          </label>
          <input
            id="lastName"
            name="lastName"
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Hinzufügen
        </button>
      </form>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2">Name</th>
            <th className="py-2">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {trainers?.map((trainer) => {
            const toggle = toggleTrainerActive.bind(
              null,
              trainer.id,
              !trainer.active,
            );
            return (
              <tr
                key={trainer.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2">
                  {trainer.first_name} {trainer.last_name}
                </td>
                <td className="py-2">
                  {trainer.active ? "aktiv" : "inaktiv"}
                </td>
                <td className="py-2 text-right">
                  <form action={toggle}>
                    <button
                      type="submit"
                      className="text-zinc-600 hover:underline dark:text-zinc-400"
                    >
                      {trainer.active ? "deaktivieren" : "aktivieren"}
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
          {!trainers?.length && (
            <tr>
              <td colSpan={3} className="py-4 text-zinc-500">
                Noch keine Trainer angelegt.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
