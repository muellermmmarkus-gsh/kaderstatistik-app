"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { notifyAdmin } from "@/lib/notifyAdmin";

export async function signUp(_prevState: string | null, formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!firstName || !lastName || !email) {
    return "Bitte alle Felder ausfüllen.";
  }
  if (password.length < 8) {
    return "Das Passwort muss mindestens 8 Zeichen lang sein.";
  }
  if (password !== passwordConfirm) {
    return "Die Passwörter stimmen nicht überein.";
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Die Rolle vergibt der Admin bei der Freigabe (Admin-Seite).
      data: { first_name: firstName, last_name: lastName },
    },
  });

  if (error) {
    return `Registrierung fehlgeschlagen: ${error.message}`;
  }

  // Leere identities = E-Mail war schon registriert (Supabase meldet das zum
  // Schutz vor Konto-Ausspaehung nicht als Fehler) - dann keine Admin-Mail.
  if (data.user?.identities?.length) {
    const host = (await headers()).get("host")!;
    const proto = host.startsWith("localhost") ? "http" : "https";
    try {
      await notifyAdmin(
        `Neue Registrierung: ${firstName} ${lastName}`,
        [
          "Neue Registrierung in der Kaderstatistik-App, die auf Freigabe wartet:",
          "",
          `Name: ${firstName} ${lastName}`,
          `E-Mail: ${email}`,
          "",
          `Freigeben oder ignorieren: ${proto}://${host}/admin`,
        ].join("\n"),
      );
    } catch (notifyError) {
      console.error("Admin-Benachrichtigung fehlgeschlagen", notifyError);
    }
  }

  redirect("/register/success");
}
