"use client";

import { useState } from "react";
import { createEvent } from "./actions";

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
// 5-Minuten-Schritte, Standard ist 00
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

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
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("00");
  const needsOpponentFields = type === "game" || type === "tournament";
  // Terminarten ohne eigene Sonderfelder (also nicht Training/Spiel/Turnier)
  // verhalten sich wie "Event": nur eine Bezeichnung noetig - das gilt
  // automatisch auch fuer neu unter Einstellungen angelegte Terminarten.
  const needsLabel = type !== "training" && !needsOpponentFields;
  // Bei "Event" ist die Bezeichnung der eigentliche Name und daher Pflicht;
  // eigene Terminarten (z.B. "Hallentraining") heissen schon nach ihrer Art.
  const labelRequired = type === "event";

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
      {/* Startuhrzeit fuer alle Terminarten, optional: Stunde waehlen, Minute steht auf 00 */}
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="eventHour">
          Startuhrzeit <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <div className="flex items-center gap-1">
          <select
            id="eventHour"
            value={hour}
            onChange={(e) => setHour(e.target.value)}
            aria-label="Stunde"
            className="rounded border border-zinc-300 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">--</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <span aria-hidden="true">:</span>
          <select
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
            disabled={!hour}
            aria-label="Minute"
            className="rounded border border-zinc-300 px-2 py-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <span className="text-sm text-zinc-500">Uhr</span>
        </div>
        <input type="hidden" name="eventTime" value={hour ? `${hour}:${minute}` : ""} />
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
            Bezeichnung{" "}
            {!labelRequired && <span className="font-normal text-zinc-500">(optional)</span>}
          </label>
          <input
            id="label"
            name="label"
            required={labelRequired}
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
