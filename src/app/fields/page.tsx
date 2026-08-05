import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { createField, deleteField } from "./actions";

export default async function FieldsPage() {
  const supabase = await createClient();
  const [{ data: fields }, canWrite] = await Promise.all([
    supabase.from("fields").select("id, name, length_m, width_m").order("name"),
    isTrainer(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Flächenplanung</h1>

      {!canWrite && (
        <p className="mb-6 text-sm text-zinc-500">
          Du hast Nur-Lese-Zugriff. Spielflächen anlegen oder löschen können
          nur Trainer.
        </p>
      )}

      {canWrite && (
        <form
          action={createField}
          className="mb-8 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="lengthM">
              Länge (m)
            </label>
            <input
              id="lengthM"
              name="lengthM"
              type="number"
              min={1}
              required
              className="w-28 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="widthM">
              Breite (m)
            </label>
            <input
              id="widthM"
              name="widthM"
              type="number"
              min={1}
              required
              className="w-28 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
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
            <th className="py-2">Name</th>
            <th className="py-2">Länge</th>
            <th className="py-2">Breite</th>
            {canWrite && <th className="py-2" />}
          </tr>
        </thead>
        <tbody>
          {fields?.map((field) => {
            const remove = deleteField.bind(null, field.id);
            return (
              <tr key={field.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">{field.name}</td>
                <td className="py-2 text-zinc-500">{field.length_m} m</td>
                <td className="py-2 text-zinc-500">{field.width_m} m</td>
                {canWrite && (
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
                )}
              </tr>
            );
          })}
          {!fields?.length && (
            <tr>
              <td colSpan={canWrite ? 4 : 3} className="py-4 text-zinc-500">
                Noch keine Spielflächen angelegt.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
