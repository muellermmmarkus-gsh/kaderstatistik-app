import Link from "next/link";

export default function RegisterSuccessPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8 text-center">
      <div className="max-w-sm">
        <h1 className="mb-3 text-xl font-semibold">Fast geschafft!</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte klicke auf
          den Link darin, um deine Registrierung abzuschließen. Danach kannst
          du dich anmelden.
        </p>
        <Link href="/login" className="underline">
          Zur Anmeldung
        </Link>
      </div>
    </div>
  );
}
