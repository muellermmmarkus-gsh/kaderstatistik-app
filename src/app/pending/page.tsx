import Link from "next/link";

export default function PendingPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8 text-center">
      <div className="max-w-sm">
        <h1 className="mb-3 text-xl font-semibold">Freischaltung ausstehend</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Dein Konto ist angelegt, aber noch nicht freigeschaltet. Zum Schutz
          der Daten der Kinder siehst du die Inhalte der App erst, wenn ein
          Trainer dein Konto freigegeben hat. Sprich dazu am besten kurz das
          Trainerteam an.
        </p>
        <Link href="/datenschutz" className="text-sm underline">
          Datenschutzhinweise
        </Link>
      </div>
    </div>
  );
}
