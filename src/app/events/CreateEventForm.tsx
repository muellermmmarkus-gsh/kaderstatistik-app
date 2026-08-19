"use client";

import { useState } from "react";
import { createEvent } from "./actions";

export default function CreateEventForm({
  seasons,
  defaultSeason,
}: {
  seasons: { name: string }[];
  defaultSeason?: string;
}) {
  const [type, setType] = useState("training");

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
          <option value="training">Training</option>
          <option value="game">Spiel</option>
          <option value="event">Event</option>
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
          required
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {type === "game" && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="opponent">
              Gegner
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
      {type === "event" && (
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="label">
            Bezeichnung Event
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
