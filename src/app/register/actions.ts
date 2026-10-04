"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { notifyAdmin } from "@/lib/notifyAdmin";
import { NEW_TEAM } from "./constants";

export async function signUp(_prevState: string | null, formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const teamChoice = String(formData.get("teamChoice") ?? "");
  const newTeamName = String(formData.get("newTeamName") ?? "").trim().slice(0, 60);
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!firstName || !lastName || !email || !teamChoice || (teamChoice === NEW_TEAM && !newTeamName)) {
    return "Bitte alle Felder ausfüllen.";
  }
  if (password.length < 8) {
    return "Das Passwort muss mindestens 8 Zeichen lang sein.";
  }
  if (password !== passwordConfirm) {
    return "Die Passwörter stimmen nicht überein.";
  }

  const supabase = await createClient();
  const { data: teamsData } = await supabase.rpc("registration_teams");
  const teams = (teamsData ?? []) as { id: string; name: string }[];

  // Beantragt wird weiterhin ein Teamname (profiles.requested_team); die
  // Admin-Seite waehlt bei der Freigabe ein gleichnamiges Team vor.
  let requestedTeam: string;
  let isNewTeam: boolean;
  if (teamChoice === NEW_TEAM) {
    const existing = teams.find((t) => t.name.toLowerCase() === newTeamName.toLowerCase());
    if (existing) {
      return `Das Team „${existing.name}“ gibt es schon – bitte in der Liste auswählen.`;
    }
    requestedTeam = newTeamName;
    isNewTeam = true;
  } else {
    const team = teams.find((t) => t.id === teamChoice);
    if (!team) return "Bitte ein Team aus der Liste auswählen.";
    requestedTeam = team.name;
    isNewTeam = false;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Rolle und Team vergibt der Admin bei der Freigabe (Admin-Seite).
      data: { first_name: firstName, last_name: lastName, requested_team: requestedTeam },
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
        `Neue Registrierung: ${firstName} ${lastName} (${requestedTeam})`,
        [
          "Neue Registrierung in der Kaderstatistik-App, die auf Freigabe wartet:",
          "",
          `Name: ${firstName} ${lastName}`,
          `E-Mail: ${email}`,
          `Beantragtes Team: ${requestedTeam} (${isNewTeam ? "neues Team" : "bestehendes Team"})`,
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
