"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "./actions";

export default function ResetPasswordPage() {
  const [error, formAction, pending] = useActionState(requestPasswordReset, null);

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-lg border border-zinc-200 p-6 dark:border-zinc-800"
      >
        <h1 className="mb-2 text-xl font-semibold">Passwort vergessen</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Gib deine E-Mail-Adresse ein. Wenn dazu ein Konto existiert,
          schicken wir dir einen Link zum Zuruecksetzen des Passworts.
        </p>

        <label className="mb-1 block text-sm font-medium" htmlFor="email">
          E-Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mb-4 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Wird gesendet…" : "Link anfordern"}
        </button>

        <p className="mt-4 text-center text-sm text-zinc-500">
          <Link href="/login" className="underline">
            Zurück zur Anmeldung
          </Link>
        </p>
      </form>
    </div>
  );
}
