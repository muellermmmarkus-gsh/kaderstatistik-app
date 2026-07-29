import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-2xl font-semibold">Kaderstatistik-App</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Anwesenheit bei Training und Spielen sowie erzielte Tore erfassen und
        auswerten.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/players"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Spieler
        </Link>
        <Link
          href="/events"
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Termine
        </Link>
        <Link
          href="/stats"
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Statistik
        </Link>
      </div>
    </div>
  );
}
