import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const WEEKDAY_LABELS = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

const MONTH_LABELS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

type EventType = "training" | "game" | "event";

const typeStyles = {
  training: "bg-blue-600 text-white",
  game: "bg-green-600 text-white",
  event: "bg-purple-600 text-white",
} as const;

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getIsoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

function getMonthWeeks(year: number, month: number) {
  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);

  const startWeekday = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - startWeekday);

  const endWeekday = (lastOfMonth.getDay() + 6) % 7;
  const gridEnd = new Date(lastOfMonth);
  gridEnd.setDate(gridEnd.getDate() + (6 - endWeekday));

  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function eventLabel(event: {
  type: "training" | "game" | "event";
  opponent: string | null;
  label: string | null;
}) {
  if (event.type === "training") return "Training";
  if (event.type === "game") return event.opponent ? `Spiel vs ${event.opponent}` : "Spiel";
  return event.label ?? "Event";
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearParam, month: monthParam } = await searchParams;

  const today = new Date();
  const year = Number(yearParam) || today.getFullYear();
  const month = Number(monthParam) || today.getMonth() + 1;

  const weeks = getMonthWeeks(year, month);
  const rangeStart = toDateKey(weeks[0][0]);
  const rangeEnd = toDateKey(weeks[weeks.length - 1][6]);

  const supabase = await createClient();
  const { data: eventsData } = await supabase
    .from("events")
    .select("id, type, event_date, opponent, label")
    .gte("event_date", rangeStart)
    .lte("event_date", rangeEnd)
    .order("event_date");

  const events = eventsData as
    | { id: string; type: EventType; event_date: string; opponent: string | null; label: string | null }[]
    | null;

  const eventsByDate = new Map<string, NonNullable<typeof events>>();
  for (const event of events ?? []) {
    const list = eventsByDate.get(event.event_date) ?? [];
    list.push(event);
    eventsByDate.set(event.event_date, list);
  }

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const todayKey = toDateKey(today);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          Kalender – {MONTH_LABELS[month - 1]} {year}
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/calendar?year=${prevMonth.year}&month=${prevMonth.month}`}
            className="rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
          >
            ← Vorheriger Monat
          </Link>
          <Link
            href={`/calendar?year=${today.getFullYear()}&month=${today.getMonth() + 1}`}
            className="rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
          >
            Heute
          </Link>
          <Link
            href={`/calendar?year=${nextMonth.year}&month=${nextMonth.month}`}
            className="rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
          >
            Nächster Monat →
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Training
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-600" /> Spiel
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-600" /> Event
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px] border border-zinc-200 dark:border-zinc-800">
          <div className="grid grid-cols-[3rem_repeat(7,1fr)] border-b border-zinc-200 text-xs font-medium text-zinc-500 dark:border-zinc-800">
            <div className="px-2 py-2" />
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={label}
                className={`px-2 py-2 ${i >= 5 ? "bg-slate-50 dark:bg-zinc-900/40" : ""}`}
              >
                {label}
              </div>
            ))}
          </div>

          {weeks.map((week) => (
            <div
              key={week[0].toISOString()}
              className="grid grid-cols-[3rem_repeat(7,1fr)] border-b border-zinc-100 last:border-b-0 dark:border-zinc-900"
            >
              <div className="border-r border-zinc-100 px-2 py-2 text-xs font-semibold text-zinc-500 dark:border-zinc-900">
                KW {getIsoWeek(week[0])}
              </div>
              {week.map((day) => {
                const dateKey = toDateKey(day);
                const inMonth = day.getMonth() + 1 === month;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isToday = dateKey === todayKey;
                const dayEvents = eventsByDate.get(dateKey) ?? [];

                return (
                  <div
                    key={dateKey}
                    className={`min-h-[6rem] border-r border-zinc-100 p-1.5 last:border-r-0 dark:border-zinc-900 ${
                      isWeekend ? "bg-slate-50 dark:bg-zinc-900/40" : ""
                    } ${!inMonth ? "bg-zinc-50 dark:bg-zinc-950" : ""}`}
                  >
                    <div
                      className={`mb-1 text-right text-xs ${
                        !inMonth
                          ? "text-zinc-400 dark:text-zinc-600"
                          : isToday
                            ? "font-semibold text-zinc-900 dark:text-zinc-100"
                            : "text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {isToday ? (
                        <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-white dark:bg-zinc-100 dark:text-zinc-900">
                          {day.getDate()}
                        </span>
                      ) : (
                        String(day.getDate()).padStart(2, "0")
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      {dayEvents.map((event) => (
                        <Link
                          key={event.id}
                          href={`/events/${event.id}`}
                          className={`truncate rounded px-1.5 py-0.5 text-xs ${typeStyles[event.type]}`}
                          title={eventLabel(event)}
                        >
                          {eventLabel(event)}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
