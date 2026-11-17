"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updatePassword } from "./actions";

export default function UpdatePasswordPage() {
  const [error, formAction, pending] = useActionState(updatePassword, null);
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    // Wichtig: nicht einfach pruefen, ob "irgendeine" Session existiert - war
    // im Browser bereits ein anderer Nutzer eingeloggt, waere sonst faelschlich
    // dessen Session akzeptiert und dessen Passwort geaendert worden. Gueltig
    // ist nur eine Session, die nachweislich frisch aus einem Reset-Link stammt.
    const supabase = createClient();
    let recovered = false;
    const markReady = () => {
      recovered = true;
      setStatus("ready");
    };

    // Neue Links (implizites Verfahren, siehe ../actions.ts): Supabase haengt
    // die Session oder einen Fehler als URL-Fragment an (#access_token=...&type=recovery
    // bzw. #error_code=otp_expired&...). Funktioniert auf jedem Geraet.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // Fragment sofort aus der Adresszeile entfernen (Tokens nicht im Verlauf lassen).
    if (window.location.hash) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
    const errorCode = hash.get("error_code");
    const errorDescription = hash.get("error_description");
    if (errorCode || errorDescription) {
      // Fehler aus dem Link (z.B. otp_expired) - nach dem Effekt anzeigen.
      queueMicrotask(() => {
        setReason(
          errorCode === "otp_expired"
            ? "Der Link ist abgelaufen oder wurde bereits verwendet (manche E-Mail-Programme öffnen Links vorab zur Prüfung)."
            : (errorDescription ?? errorCode),
        );
        setStatus("invalid");
      });
      return;
    }
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken && hash.get("type") === "recovery") {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            setReason(error.message);
            setStatus("invalid");
          } else {
            markReady();
          }
        })
        .catch(() => {
          // z.B. beschaedigter Link (Token nicht lesbar)
          setStatus("invalid");
        });
      return;
    }

    // Aeltere Links (PKCE, ?code=...): nur im Browser gueltig, in dem der Reset
    // angefordert wurde; das "PASSWORD_RECOVERY"-Event bestaetigt die Session.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") markReady();
    });

    const timeout = setTimeout(() => {
      if (!recovered) setStatus("invalid");
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
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
            {reason ?? "Der Link ist abgelaufen oder wurde bereits verwendet."} Bitte
            fordere einen neuen Link an. Es gilt immer nur der zuletzt angeforderte Link.
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
