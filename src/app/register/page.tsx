import { createClient } from "@/lib/supabase/server";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const supabase = await createClient();
  // Alle Teams fuer die Auswahlliste (nur Id und Name, siehe migration_037).
  const { data } = await supabase.rpc("registration_teams");
  const teams = (data ?? []) as { id: string; name: string }[];

  return <RegisterForm teams={teams} />;
}
