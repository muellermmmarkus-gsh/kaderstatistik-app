"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updatePassword } from "./actions";

export default function UpdatePasswordPage() {
  const [error, formAction, pending] = useActionState(updatePassword, null);
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");

  useEffect(() => {
    // Der Reset-Link liefert die Session nur als URL-Fragment (#access_token=...),
    // das der Server nie sieht. getSession() wartet auf die automatische
    // Verarbeitung dieses Fragments durch den Browser-Client und legt die
    // Session danach in Cookies ab, damit die Server Action sie lesen kann.
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus(session ? "ready" : "invalid");
    });
  }, []);

  if (status === "checking") {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8 text-center text-sm text-zinc-500">
        Link wird geprüft…
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8 text-center">
        <div className="max-w-sm">
          <h1 className="mb-3 text-xl font-semibold">Link ungültig</h1>
          <p className="mb-6 text-sm text-zinc-500">
            Der Link ist abgelaufen oder wurde bereits verwendet. Bitte
            fordere einen neuen Link an.
          </p>
          <Link href="/reset-password" className="underline">
            Neuen Link anfordern
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-lg border border-zinc-200 p-6 dark:border-zinc-800"
      >
        <h1 className="mb-6 text-xl font-semibold">Neues Passwort vergeben</h1>

        <label className="mb-1 block text-sm font-medium" htmlFor="password">
          Neues Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mb-4 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />

        <label className="mb-1 block text-sm font-medium" htmlFor="passwordConfirm">
          Neues Passwort bestätigen
        </label>
        <input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mb-4 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Speichern…" : "Passwort speichern"}
        </button>
      </form>
    </div>
  );
}
