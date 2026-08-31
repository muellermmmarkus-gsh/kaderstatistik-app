type ExerciseValues = {
  name: string;
  aufbau: string;
  ablauf: string;
  coaching: string | null;
  hauptzweck: string;
  nebenzweck: string | null;
  min_players: number;
  max_players: number;
  small_goals: number;
  mini_goals: number;
  category: string;
  field_id: string | null;
  image_url: string | null;
  source_url: string | null;
};

type FieldOption = { id: string; name: string; length_m: number; width_m: number };

const categoryOptions = [
  { value: "aufwaermen", label: "Aufwärmen" },
  { value: "spielen", label: "Spielen" },
  { value: "ueben", label: "Üben" },
  { value: "cooldown", label: "Cool-down" },
];

export default function ExerciseForm({
  action,
  initial,
  fields,
  focuses,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  initial?: ExerciseValues;
  fields: FieldOption[];
  focuses: string[];
  submitLabel: string;
}) {
  // Bereits gespeicherte Werte, die inzwischen aus der Übungsplanung entfernt
  // wurden, bleiben als Option erhalten, damit die Auswahl beim Speichern
  // nicht stillschweigend verloren geht.
  const hauptzweckOptions =
    initial?.hauptzweck && !focuses.includes(initial.hauptzweck)
      ? [initial.hauptzweck, ...focuses]
      : focuses;
  const nebenzweckOptions =
    initial?.nebenzweck && !focuses.includes(initial.nebenzweck)
      ? [initial.nebenzweck, ...focuses]
      : focuses;

  return (
    <form action={action} className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex-1">
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
          <label className="mb-1 block text-sm font-medium" htmlFor="sourceUrl">
            Quelle (Link, optional)
          </label>
          <input
            id="sourceUrl"
            name="sourceUrl"
            type="url"
            placeholder="https://…"
            defaultValue={initial?.source_url ?? ""}
            className="w-56 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
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

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="coaching">
          Coaching
        </label>
        <textarea
          id="coaching"
          name="coaching"
          rows={3}
          defaultValue={initial?.coaching ?? ""}
          className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="hauptzweck">
            Übungsschwerpunkt 1
          </label>
          <select
            id="hauptzweck"
            name="hauptzweck"
            required
            defaultValue={initial?.hauptzweck ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">– wählen –</option>
            {hauptzweckOptions.map((focus) => (
              <option key={focus} value={focus}>
                {focus}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="nebenzweck">
            Übungsschwerpunkt 2
          </label>
          <select
            id="nebenzweck"
            name="nebenzweck"
            defaultValue={initial?.nebenzweck ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">– keine Auswahl –</option>
            {nebenzweckOptions.map((focus) => (
              <option key={focus} value={focus}>
                {focus}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="category">
            Kategorie
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue={initial?.category ?? "ueben"}
            className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="fieldId">
            Spielfeld/Übungsfläche
          </label>
          <select
            id="fieldId"
            name="fieldId"
            defaultValue={initial?.field_id ?? ""}
            className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">– keine Auswahl –</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name} ({field.length_m}×{field.width_m} m)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="image">
          Bild
        </label>
        {initial?.image_url && (
          <div className="mb-2 flex items-center gap-3">
            <a href={initial.image_url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- externe Supabase-Storage-URL, next/image benoetigt bekannte Domains */}
              <img
                src={initial.image_url}
                alt=""
                className="h-16 w-16 rounded border border-zinc-300 object-cover dark:border-zinc-700"
              />
            </a>
            <label className="flex items-center gap-2 text-sm text-zinc-500">
              <input type="checkbox" name="removeImage" className="h-4 w-4" />
              Bild entfernen
            </label>
          </div>
        )}
        <input
          id="image"
          name="image"
          type="file"
          accept="image/*"
          className="block w-full text-sm"
        />
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
