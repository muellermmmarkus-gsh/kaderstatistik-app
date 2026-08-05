import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import { addSeason, deleteSeason, setDefaultSeason } from "./actions";
import BackButton from "@/components/BackButton";
import SaveNotice from "@/components/SaveNotice";

export default async function SeasonsPage() {
  const supabase = await createClient();
  const [{ data: seasons }, canWrite] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, is_default")
      .order("name", { ascending: false }),
    isTrainer(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <h1 className="mb-6 text-xl font-semibold">Saisonverwaltung</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Hier legst du die Saisons an, die bei Terminen zur Auswahl stehen.
        Die als Standard markierte Saison ist bei neuen Terminen vorausgewählt.
        {!canWrite && " Du hast Nur-Lese-Zugriff, Änderungen können nur Trainer vornehmen."}
      </p>

      {canWrite && (
        <form
          action={addSeason}
          className="mb-8 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="name">
              Saison
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="2026/2027"
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Anlegen
          </button>
          <SaveNotice />
        </form>
      )}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2">Saison</th>
            <th className="py-2">Standard</th>
            {canWrite && <th className="py-2" />}
          </tr>
        </thead>
        <tbody>
          {seasons?.map((season) => {
            const makeDefault = setDefaultSeason.bind(null, season.id);
            const remove = deleteSeason.bind(null, season.id);
            return (
              <tr
                key={season.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2">{season.name}</td>
                <td className="py-2">
                  {season.is_default ? (
                    <span className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
                      Standard
                    </span>
                  ) : canWrite ? (
                    <form action={makeDefault}>
                      <button
                        type="submit"
                        className="text-zinc-600 hover:underline dark:text-zinc-400"
                      >
                        als Standard markieren
                      </button>
                    </form>
                  ) : (
                    "–"
                  )}
                </td>
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
          {!seasons?.length && (
            <tr>
              <td colSpan={canWrite ? 3 : 2} className="py-4 text-zinc-500">
                Noch keine Saison angelegt.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
