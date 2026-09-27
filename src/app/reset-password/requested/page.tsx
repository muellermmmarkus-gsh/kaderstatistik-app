import Link from "next/link";

export default function ResetPasswordRequestedPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8 text-center">
      <div className="max-w-sm">
        <h1 className="mb-3 text-xl font-semibold">E-Mail unterwegs</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Falls zu dieser E-Mail-Adresse ein Konto existiert, haben wir dir
          einen Link zum Zuruecksetzen des Passworts geschickt. Bitte klicke
          auf den Link in der E-Mail, um ein neues Passwort zu vergeben.
        </p>
        <Link href="/login" className="underline">
          Zur Anmeldung
        </Link>
      </div>
    </div>
  );
}
