"use client";

import Link from "next/link";
import { useState } from "react";
import CreateEventForm from "@/app/events/CreateEventForm";

export type DayCell = {
  dateKey: string;
  dayNumber: number;
  inMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
  events: { id: string; colorClass: string; label: string; title: string }[];
  absences: { id: string; colorClass: string; label: string; title: string }[];
  birthdays: { key: string; label: string; title: string }[];
};

type WeekRow = { isoWeek: number; days: DayCell[] };

export default function CalendarGrid({
  weekRows,
  canWrite,
  seasons,
  defaultSeason,
}: {
  weekRows: WeekRow[];
  canWrite: boolean;
  seasons: { name: string; is_default: boolean }[];
  defaultSeason?: string;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  return (
    <>
      {weekRows.map((week) => (
        <div
          key={week.days[0].dateKey}
          className="grid grid-cols-[3rem_repeat(7,1fr)] border-b border-zinc-100 last:border-b-0 dark:border-zinc-900"
        >
          <div className="border-r border-zinc-100 px-2 py-2 text-xs font-semibold text-zinc-500 dark:border-zinc-900">
            KW {week.isoWeek}
          </div>
          {week.days.map((day) => (
            <div
              key={day.dateKey}
              onClick={canWrite ? () => setSelectedDate(day.dateKey) : undefined}
              className={`h-28 min-w-0 overflow-y-auto border-r border-zinc-100 p-1.5 last:border-r-0 dark:border-zinc-900 ${
                day.isWeekend ? "bg-slate-50 dark:bg-zinc-900/40" : ""
              } ${!day.inMonth ? "bg-zinc-50 dark:bg-zinc-950" : ""} ${
                canWrite ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/40" : ""
              }`}
            >
              <div
                className={`mb-1 text-right text-xs ${
                  !day.inMonth
                    ? "text-zinc-400 dark:text-zinc-600"
                    : day.isToday
                      ? "font-semibold text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {day.isToday ? (
                  <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {String(day.dayNumber).padStart(2, "0")}
                  </span>
                ) : (
                  String(day.dayNumber).padStart(2, "0")
                )}
              </div>
              <div className="flex flex-col gap-1">
                {day.events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className={`block rounded px-1.5 py-0.5 text-xs break-words ${event.colorClass}`}
                    title={event.title}
                  >
                    {event.label}
                  </Link>
                ))}
                {day.absences.map((absence) => (
                  <Link
                    key={absence.id}
                    href="/absences"
                    onClick={(e) => e.stopPropagation()}
                    className={`block rounded px-1.5 py-0.5 text-xs break-words ${absence.colorClass} text-white`}
                    title={absence.title}
                  >
                    {absence.label}
                  </Link>
                ))}
                {day.birthdays.map((birthday) => (
                  <span
                    key={birthday.key}
                    onClick={(e) => e.stopPropagation()}
                    className="block rounded bg-amber-500 px-1.5 py-0.5 text-xs break-words text-zinc-900"
                    title={birthday.title}
                  >
                    {birthday.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Neuer Termin – {selectedDate}</h2>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-sm text-zinc-500 hover:underline"
              >
                Abbrechen
              </button>
            </div>

            {!seasons.length ? (
              <p className="text-sm text-zinc-500">
                Bevor du Termine anlegen kannst, richte unter{" "}
                <Link href="/seasons" className="underline">
                  Saisonverwaltung
                </Link>{" "}
                mindestens eine Saison ein.
              </p>
            ) : (
              <CreateEventForm
                seasons={seasons}
                defaultSeason={defaultSeason}
                defaultDate={selectedDate}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
