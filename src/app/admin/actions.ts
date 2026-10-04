"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/profile";

const ROLES = new Set(["pending", "parent_player", "trainer"]);
const NEW_TEAM = "__new__";

function fail(message: string): never {
  redirect(`/admin?error=${encodeURIComponent(message)}`);
}

/**
 * Freigabe bzw. Aenderung eines Nutzers: Team (bestehend oder neu aus dem
 * beantragten Namen) und Rolle. Zugriff auf eine Team-App hat nur, wer
 * Trainer ist UND einem Team zugeordnet ist.
 */
export async function saveUserAccess(userId: string, formData: FormData) {
  const role = String(formData.get("role") ?? "");
  const teamChoice = String(formData.get("team") ?? "");
  const newTeamName = String(formData.get("newTeamName") ?? "").trim().slice(0, 60);
  if (!ROLES.has(role)) fail("Ungültige Rolle.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdmin())) fail("Keine Berechtigung.");
  // Eigenen Zugang nicht aenderbar, damit sich der Admin nicht aussperrt.
  if (user.id === userId) fail("Den eigenen Zugang kannst du hier nicht ändern.");

  let teamId: string | null = teamChoice && teamChoice !== NEW_TEAM ? teamChoice : null;
  if (teamChoice === NEW_TEAM) {
    if (!newTeamName) fail("Bitte einen Namen für das neue Team eingeben.");
    const { data: team, error } = await supabase
      .from("teams")
      .insert({ name: newTeamName, match_name: newTeamName })
      .select("id")
      .single();
    if (error || !team) {
      fail(
        error?.code === "23505"
          ? `Ein Team "${newTeamName}" gibt es schon – bitte in der Liste auswählen.`
          : `Team konnte nicht angelegt werden: ${error?.message ?? "unbekannter Fehler"}`,
      );
    }
    teamId = team.id;
  }
  if (role === "trainer" && !teamId) fail("Ein Trainer braucht ein Team.");

  const { error } = await supabase
    .from("profiles")
    .update({ role, team_id: teamId })
    .eq("id", userId);
  if (error) fail(`Zugang konnte nicht gespeichert werden: ${error.message}`);

  revalidatePath("/admin");
  redirect("/admin?saved=1");
}

/**
 * Teamwechsel fuer den Admin: ordnet das eigene Konto einem anderen Team zu.
 * Alle Teamdaten (per RLS ueber current_team_id()) zeigen dann dieses Team.
 */
export async function switchTeam(teamId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdmin())) return "Nur der Administrator kann das Team wechseln.";

  const { data: team } = await supabase.from("teams").select("id").eq("id", teamId).maybeSingle();
  if (!team) return "Team nicht gefunden.";

  const { error } = await supabase.from("profiles").update({ team_id: teamId }).eq("id", user.id);
  if (error) return `Team konnte nicht gewechselt werden: ${error.message}`;

  revalidatePath("/", "layout");
  // Zur Startseite, damit keine Detailseite des alten Teams offen bleibt.
  redirect("/");
}

export async function updateTeam(teamId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const matchName = String(formData.get("matchName") ?? "").trim().slice(0, 80);
  if (!name || !matchName) fail("Teamname und Name im Spielbetrieb dürfen nicht leer sein.");
  if (!(await isAdmin())) fail("Keine Berechtigung.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ name, match_name: matchName })
    .eq("id", teamId);
  if (error) {
    fail(
      error.code === "23505"
        ? `Ein Team "${name}" gibt es schon.`
        : `Team konnte nicht gespeichert werden: ${error.message}`,
    );
  }

  revalidatePath("/", "layout");
  redirect("/admin?saved=1");
}
