import Link from "next/link";

export default function PendingPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8 text-center">
      <div className="max-w-sm">
        <h1 className="mb-3 text-xl font-semibold">Kein Zugriff</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Dein Konto ist angelegt, aber derzeit nicht für die Inhalte der App
          freigegeben. Zum Schutz der Daten der Kinder entscheidet der
          Administrator über den Zugriff. Bei Fragen wende dich an das
          Trainerteam.
        </p>
        <Link href="/datenschutz" className="text-sm underline">
          Datenschutzhinweise
        </Link>
      </div>
    </div>
  );
}
