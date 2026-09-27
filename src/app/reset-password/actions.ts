"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(_prevState: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return "Bitte E-Mail-Adresse eingeben.";
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host")!;
  const proto = host.startsWith("localhost") ? "http" : "https";

  const supabase = await createClient();
  // Fehler bewusst ignoriert: unabhaengig davon, ob die E-Mail existiert,
  // wird immer dieselbe Bestaetigung angezeigt (kein User-Enumeration-Leak).
  // redirectTo steuert das Ziel unabhaengig vom (nicht anpassbaren) E-Mail-
  // Template - Supabase haengt die Session dort als URL-Fragment an.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${proto}://${host}/reset-password/update`,
  });

  redirect("/reset-password/requested");
}
