"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_prevState: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return "Anmeldung fehlgeschlagen. E-Mail oder Passwort falsch.";
  }

  if (data.user) {
    // Best effort - schlaegt die Protokollierung fehl, soll der Login trotzdem klappen.
    await supabase.from("login_events").insert({ user_id: data.user.id });
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
