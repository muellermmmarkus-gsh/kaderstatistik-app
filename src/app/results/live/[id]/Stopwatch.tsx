"use client";

import { useEffect, useRef, useState } from "react";

const QUARTER_MINUTES = 15;
const QUARTERS = [1, 2, 3, 4] as const;
type Quarter = (typeof QUARTERS)[number];

type State = {
  quarter: Quarter;
  /** Bereits gelaufene Zeit vor dem letzten Start (ms). */
  accumulatedMs: number;
  /** Zeitpunkt des letzten Starts, null = gestoppt. */
  startedAt: number | null;
};

const INITIAL: State = { quarter: 1, accumulatedMs: 0, startedAt: null };

function readSaved(storageKey: string): State {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const saved = JSON.parse(raw) as State;
      if (QUARTERS.includes(saved.quarter) && typeof saved.accumulatedMs === "number") return saved;
    }
  } catch {
    // Kein Speicher verfuegbar oder ungueltiger Inhalt - Uhr startet neu.
  }
  return INITIAL;
}

const elapsedMs = (s: State, now: number) =>
  s.accumulatedMs + (s.startedAt !== null ? now - s.startedAt : 0);

// Spielminute laut Uhr: Startminute des Viertels plus gelaufene volle Minuten.
// null, solange die Uhr im Reset-Zustand steht (kein Vorschlag).
const minuteOf = (s: State, now: number) => {
  const ms = elapsedMs(s, now);
  if (s.startedAt === null && ms === 0) return null;
  return (s.quarter - 1) * QUARTER_MINUTES + Math.floor(ms / 60000);
};

function format(s: State, now: number) {
  const totalSeconds = (s.quarter - 1) * QUARTER_MINUTES * 60 + Math.floor(elapsedMs(s, now) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Stoppuhr fuer das Live-Ergebnis. Rechnet mit Zeitstempeln und merkt sich den
 * Stand je Spiel im Browser - laeuft also weiter, wenn das Handy sperrt oder
 * die Seite neu geladen wird. Meldet die aktuelle Spielminute (nur wenn sie
 * sich aendert) als Vorschlag fuer den naechsten Toreintrag.
 */
export default function Stopwatch({
  eventId,
  onMinuteChange,
}: {
  eventId: string;
  onMinuteChange: (minute: number | null) => void;
}) {
  const storageKey = `live-stopwatch:${eventId}`;
  // Nur im Browser gerendert (dynamic ssr:false im LiveResultBoard), daher
  // kann der gespeicherte Stand direkt beim Start gelesen werden.
  const [state, setState] = useState<State>(() => readSaved(storageKey));
  const [now, setNow] = useState(() => Date.now());
  const lastMinute = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Ohne Speicher (z.B. privates Fenster) laeuft die Uhr nur bis zum Neuladen.
    }
  }, [state, storageKey]);

  useEffect(() => {
    if (state.startedAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [state.startedAt]);

  const minute = minuteOf(state, now);
  useEffect(() => {
    if (minute !== lastMinute.current) {
      lastMinute.current = minute;
      onMinuteChange(minute);
    }
  }, [minute, onMinuteChange]);

  const running = state.startedAt !== null;

  function startStop() {
    const t = Date.now();
    setNow(t);
    setState((s) =>
      s.startedAt === null
        ? { ...s, startedAt: t }
        : { ...s, accumulatedMs: elapsedMs(s, t), startedAt: null },
    );
  }

  function reset(quarter: Quarter = state.quarter) {
    setState({ quarter, accumulatedMs: 0, startedAt: null });
  }

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 px-2 py-1.5 xl:mb-6 xl:gap-4 xl:px-4 xl:py-2 dark:border-zinc-800">
      <div
        role="radiogroup"
        aria-label="Viertel"
        className="flex overflow-hidden rounded border border-zinc-300 text-xs xl:text-sm dark:border-zinc-700"
      >
        {QUARTERS.map((q) => (
          <button
            key={q}
            type="button"
            role="radio"
            aria-checked={state.quarter === q}
            title={`${q}. Viertel – Uhr startet bei ${(q - 1) * QUARTER_MINUTES}:00`}
            onClick={() => reset(q)}
            className={`px-2 py-1.5 xl:px-3 ${
              state.quarter === q
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            {q}.<span className="hidden sm:inline">Viertel</span>
            <span className="sm:hidden">V</span>
          </button>
        ))}
      </div>

      <span
        aria-live="off"
        aria-label="Spielzeit"
        className={`min-w-[4.5rem] text-center text-2xl font-bold tabular-nums ${running ? "text-green-700 dark:text-green-400" : ""}`}
      >
        {format(state, now)}
      </span>

      <div className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={startStop}
          className={`rounded px-3 py-1.5 text-sm font-semibold text-white ${
            running ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {running ? "Stop" : "Start"}
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
