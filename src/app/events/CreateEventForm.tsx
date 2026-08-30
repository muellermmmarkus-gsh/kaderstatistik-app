"use client";

import { useState } from "react";
import { createEvent } from "./actions";

export default function CreateEventForm({
  seasons,
  defaultSeason,
  defaultDate,
  eventTypes,
}: {
  seasons: { name: string }[];
  defaultSeason?: string;
  defaultDate?: string;
  eventTypes: { key: string; label: string }[];
}) {
  const [type, setType] = useState(eventTypes[0]?.key ?? "");
  const needsOpponentFields = type === "game" || type === "tournament";
  // Terminarten ohne eigene Sonderfelder (also nicht Training/Spiel/Turnier)
  // verhalten sich wie "Event": nur eine Bezeichnung noetig - das gilt
  // automatisch auch fuer neu unter Einstellungen angelegte Terminarten.
  const needsLabel = type !== "training" && !needsOpponentFields;

  return (
    <form
      action={createEvent}
      className="mb-8 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="type">
          Art
        </label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {eventTypes.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="eventDate">
          Datum
        </label>
        <input
          id="eventDate"
          name="eventDate"
          type="date"
          defaultValue={defaultDate}
          required
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {needsOpponentFields && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="opponent">
              {type === "tournament" ? "Gegner/Teilnehmer" : "Gegner"}
            </label>
            <input
              id="opponent"
              name="opponent"
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="eventTime">
              Uhrzeit
            </label>
            <input
              id="eventTime"
              name="eventTime"
              type="time"
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="location">
              Spielort
            </label>
            <input
              id="location"
              name="location"
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </>
      )}
      {needsLabel && (
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="label">
            Bezeichnung
          </label>
          <input
            id="label"
            name="label"
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="season">
          Saison
        </label>
        <select
          id="season"
          name="season"
          required
          defaultValue={defaultSeason}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {seasons.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Anlegen
      </button>
    </form>
  );
}
