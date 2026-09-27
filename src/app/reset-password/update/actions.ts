"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(_prevState: string | null, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (password.length < 8) {
    return "Das Passwort muss mindestens 8 Zeichen lang sein.";
  }
  if (password !== passwordConfirm) {
    return "Die Passwörter stimmen nicht überein.";
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "Der Link ist abgelaufen oder ungültig. Bitte fordere einen neuen Link an.";
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return "Passwort konnte nicht geändert werden. Bitte versuche es erneut.";
  }

  redirect("/");
}
