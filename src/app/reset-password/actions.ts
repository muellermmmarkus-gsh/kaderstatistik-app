"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function requestPasswordReset(_prevState: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return "Bitte E-Mail-Adresse eingeben.";
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host")!;
  const proto = host.startsWith("localhost") ? "http" : "https";

  // Bewusst NICHT der Server-Client aus lib/supabase/server: der erzwingt das
  // PKCE-Verfahren, bei dem der Link nur in dem Browser funktioniert, in dem
  // der Reset angefordert wurde (Code-Verifier im Cookie). Fordert z.B. der
  // Admin den Link fuer einen User an oder oeffnet der User ihn am Handy,
  // waere er dort "ungueltig". Mit dem impliziten Verfahren haengt Supabase
  // die Session als URL-Fragment an - das funktioniert auf jedem Geraet.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false } },
  );
  // Fehler bewusst ignoriert: unabhaengig davon, ob die E-Mail existiert,
  // wird immer dieselbe Bestaetigung angezeigt (kein User-Enumeration-Leak).
  // redirectTo steuert das Ziel unabhaengig vom (nicht anpassbaren) E-Mail-
  // Template.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${proto}://${host}/reset-password/update`,
  });

  redirect("/reset-password/requested");
}
