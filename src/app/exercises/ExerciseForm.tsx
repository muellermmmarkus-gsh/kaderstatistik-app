type ExerciseValues = {
  name: string;
  aufbau: string;
  ablauf: string;
  hauptzweck: string;
  nebenzweck: string | null;
  min_players: number;
  max_players: number;
  small_goals: number;
  mini_goals: number;
};

export default function ExerciseForm({
  action,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  initial?: ExerciseValues;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initial?.name}
          className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="aufbau">
          Aufbau
        </label>
        <textarea
          id="aufbau"
          name="aufbau"
          rows={3}
          defaultValue={initial?.aufbau}
          className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="ablauf">
          Ablauf
        </label>
        <textarea
          id="ablauf"
          name="ablauf"
          rows={3}
          defaultValue={initial?.ablauf}
          className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="hauptzweck">
            Hauptzweck
          </label>
          <input
            id="hauptzweck"
            name="hauptzweck"
            required
            defaultValue={initial?.hauptzweck}
            className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="nebenzweck">
            Nebenzweck
          </label>
          <input
            id="nebenzweck"
            name="nebenzweck"
            defaultValue={initial?.nebenzweck ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="minPlayers">
            Mindestzahl Spieler
          </label>
          <input
            id="minPlayers"
            name="minPlayers"
            type="number"
            min={1}
            required
            defaultValue={initial?.min_players}
            className="w-32 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="maxPlayers">
            Höchstzahl Spieler
          </label>
          <input
            id="maxPlayers"
            name="maxPlayers"
            type="number"
            min={1}
            required
            defaultValue={initial?.max_players}
            className="w-32 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="smallGoals">
            Anzahl Kleinfeldtore
          </label>
          <input
            id="smallGoals"
            name="smallGoals"
            type="number"
            min={0}
            defaultValue={initial?.small_goals ?? 0}
            className="w-32 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="miniGoals">
            Anzahl Mini-Tore
          </label>
          <input
            id="miniGoals"
            name="miniGoals"
            type="number"
            min={0}
            defaultValue={initial?.mini_goals ?? 0}
            className="w-32 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <button
        type="submit"
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        {submitLabel}
      </button>
    </form>
  );
}
