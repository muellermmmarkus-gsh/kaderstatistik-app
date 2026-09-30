"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Die Rolle vergibt ein Trainer nach der Freischaltung (Admin-Seite).
      data: { first_name: firstName, last_name: lastName },
    },
  });

  if (error) {
    return `Registrierung fehlgeschlagen: ${error.message}`;
  }

  redirect("/register/success");
}
