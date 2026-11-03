"use client";

import { useState, useTransition } from "react";
import { updateEventSeason } from "./actions";

/** Saison eines Termins direkt im Termin aendern (speichert sofort). */
export default function SeasonSelect({
  eventId,
  season,
  seasons,
}: {
  eventId: string;
  season: string;
  seasons: string[];
}) {
  const [value, setValue] = useState(season);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  // Aktuelle Saison auch dann anbieten, wenn sie nicht (mehr) in der Liste steht.
  const options = seasons.includes(season) ? seasons : [season, ...seasons];

  function change(next: string) {
    const previous = value;
    setValue(next);
    setMessage(null);
    startTransition(async () => {
      const { error } = await updateEventSeason(eventId, next);
      if (error) {
        setValue(previous);
        setMessage({ text: error, error: true });
      } else {
        setMessage({ text: "gespeichert" });
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <label htmlFor="event-season">Saison</label>
      <select
        id="event-season"
        value={value}
        onChange={(e) => change(e.target.value)}
        disabled={pending}
        className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-sm text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {message && (
        <span role="status" className={message.error ? "text-red-600" : "text-green-700 dark:text-green-400"}>
          {message.text}
        </span>
      )}
    </span>
  );
}
