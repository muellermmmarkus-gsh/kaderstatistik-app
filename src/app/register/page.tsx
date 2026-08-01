"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "./actions";

export default function RegisterPage() {
  const [error, formAction, pending] = useActionState(signUp, null);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-lg border border-zinc-200 p-6 dark:border-zinc-800"
      >
        <h1 className="mb-6 text-xl font-semibold">Registrieren</h1>

        <label className="mb-1 block text-sm font-medium" htmlFor="firstName">
          Vorname
        </label>
        <input
          id="firstName"
          name="firstName"
          required
          className="mb-4 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />

        <label className="mb-1 block text-sm font-medium" htmlFor="lastName">
          Name
        </label>
        <input
          id="lastName"
          name="lastName"
          required
          className="mb-4 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />

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

        <label className="mb-1 block text-sm font-medium" htmlFor="role">
          Rolle
        </label>
        <select
          id="role"
          name="role"
          required
          defaultValue=""
          className="mb-4 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="" disabled>
            Bitte wählen
          </option>
          <option value="trainer">Trainer</option>
          <option value="parent_player">Eltern/Spieler</option>
        </select>

        <label className="mb-1 block text-sm font-medium" htmlFor="password">
          Passwort
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
          Passwort bestätigen
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
          {pending ? "Registrieren…" : "Registrieren"}
        </button>

        <p className="mt-4 text-center text-sm text-zinc-500">
          Schon registriert?{" "}
          <Link href="/login" className="underline">
            Anmelden
          </Link>
        </p>
      </form>
    </div>
  );
}
