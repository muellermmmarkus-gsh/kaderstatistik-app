import Link from "next/link";

export default function RegisterSuccessPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8 text-center">
      <div className="max-w-sm">
        <h1 className="mb-3 text-xl font-semibold">Registrierung eingegangen</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Deine Registrierung wurde an den Administrator zur Freigabe
          geschickt. Bitte bestätige außerdem deine E-Mail-Adresse über den
          Link in der E-Mail, die wir dir gerade geschickt haben. Die Inhalte
          der App siehst du erst, wenn der Administrator dich freigegeben hat.
        </p>
        <Link href="/login" className="underline">
          Zur Anmeldung
        </Link>
      </div>
    </div>
  );
}
