import { createClient } from "@/lib/supabase/server";
import { isTrainer } from "@/lib/supabase/profile";
import {
  addPlayer,
  deletePlayer,
  togglePlayerActive,
  updatePlayerBirthDate,
} from "./actions";
import BackButton from "@/components/BackButton";
import DeleteButton from "@/components/DeleteButton";
import SaveNotice from "@/components/SaveNotice";

export default async function PlayersPage() {
  const supabase = await createClient();
  const [{ data: players }, canWrite] = await Promise.all([
    supabase
      .from("players")
      .select("id, first_name, last_name, birth_date, passnummer, active")
      .order("last_name"),
    isTrainer(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <h1 className="mb-6 text-xl font-semibold">Spieler</h1>

      {!canWrite && (
        <p className="mb-6 text-sm text-zinc-500">
          Du hast Nur-Lese-Zugriff. Änderungen können nur Trainer vornehmen.
        </p>
      )}

      {canWrite && (
      <form
        action={addPlayer}
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
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="birthDate">
            Geburtsdatum
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="passnummer">
            Passnummer
          </label>
          <input
            id="passnummer"
            name="passnummer"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Hinzufügen
        </button>
        <SaveNotice />
      </form>
      )}

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2">Name</th>
            <th className="py-2">Geburtsdatum</th>
            <th className="py-2">Passnummer</th>
            <th className="py-2">Status</th>
            {canWrite && <th className="py-2" />}
          </tr>
        </thead>
        <tbody>
          {players?.map((player) => {
            const toggle = togglePlayerActive.bind(
              null,
              player.id,
              !player.active,
            );
            const remove = deletePlayer.bind(null, player.id);
            const saveBirthDate = updatePlayerBirthDate.bind(null, player.id);
            return (
              <tr
                key={player.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2">
                  {player.first_name} {player.last_name}
                </td>
                <td className="py-2 text-zinc-500">
                  {canWrite ? (
                    <form action={saveBirthDate} className="flex items-center gap-1">
                      <input
                        type="date"
                        name="birthDate"
                        defaultValue={player.birth_date ?? ""}
                        className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <button
                        type="submit"
                        className="text-xs text-zinc-600 hover:underline dark:text-zinc-400"
                      >
                        speichern
                      </button>
                    </form>
                  ) : (
                    (player.birth_date ?? "–")
                  )}
                </td>
                <td className="py-2 text-zinc-500">
                  {player.passnummer ?? "–"}
                </td>
                <td className="py-2">
                  {player.active ? "aktiv" : "inaktiv"}
                </td>
                {canWrite && (
                  <td className="py-2 text-right">
                    <form action={toggle} className="inline">
                      <button
                        type="submit"
                        className="text-zinc-600 hover:underline dark:text-zinc-400"
                      >
                        {player.active ? "deaktivieren" : "aktivieren"}
                      </button>
                    </form>
                    <form action={remove} className="ml-3 inline">
                      <DeleteButton
                        confirmMessage={`${player.first_name} ${player.last_name} wirklich löschen? Alle Anwesenheits- und Tordaten dieses Spielers werden unwiderruflich mitgelöscht.`}
                        className="text-red-600 hover:underline dark:text-red-400"
                      >
                        löschen
                      </DeleteButton>
                    </form>
                  </td>
                )}
              </tr>
            );
          })}
          {!players?.length && (
            <tr>
              <td colSpan={canWrite ? 5 : 4} className="py-4 text-zinc-500">
                Noch keine Spieler angelegt.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
