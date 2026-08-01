"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const VALID_ROLES = new Set(["trainer", "parent_player"]);

export async function signUp(_prevState: string | null, formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!firstName || !lastName || !email || !role) {
    return "Bitte alle Felder ausfüllen.";
  }
  if (!VALID_ROLES.has(role)) {
    return "Bitte eine gültige Rolle auswählen.";
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
      data: { first_name: firstName, last_name: lastName, role },
    },
  });

  if (error) {
    return `Registrierung fehlgeschlagen: ${error.message}`;
  }

  redirect("/register/success");
}
