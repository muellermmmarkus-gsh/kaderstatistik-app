import { headers } from "next/headers";
import { getCurrentProfile } from "@/lib/supabase/profile";
import BackButton from "@/components/BackButton";
import BfvWidget from "./BfvWidget";

export default async function CompetitionsPage() {
  const [profile, requestHeaders] = await Promise.all([getCurrentProfile(), headers()]);
  // Der BFV-iframe erwartet den Hostnamen der einbettenden Seite.
  const host = (requestHeaders.get("host") ?? "").split(":")[0];
  const competitionId = profile?.teamBfvCompetitionId;

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <BackButton href="/" />
      <h1 className="mb-1 text-xl font-semibold">Wettbewerbe</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Ergebnisse, Tabelle und Torschützen des BFV-Wettbewerbs deines Teams
        (Daten von bfv.de).
      </p>

      {competitionId ? (
        <BfvWidget competitionId={competitionId} host={host} />
      ) : (
        <p className="rounded border border-zinc-200 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-800">
          Für dein Team ist noch kein BFV-Wettbewerb hinterlegt.{" "}
          {profile?.isAdmin
            ? "Trage die Wettbewerbs-ID aus dem BFV-Widget-Code unter ADMIN → Teams ein."
            : "Der Administrator kann ihn unter ADMIN → Teams eintragen."}
        </p>
      )}
    </div>
  );
}
