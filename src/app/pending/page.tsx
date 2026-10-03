import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/profile";

export default async function PendingPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8 text-center">
      <div className="max-w-sm">
        <h1 className="mb-3 text-xl font-semibold">Kein Zugriff</h1>
        <p className="mb-4 text-sm text-zinc-500">
          Dein Konto ist angelegt, aber derzeit nicht für die App
          freigegeben. Der Administrator prüft deine Anfrage und gibt dich
          und dein Team frei. Danach siehst du hier die App deines Teams.
        </p>
        {profile?.requestedTeam && (
          <p className="mb-6 text-sm">
            Beantragtes Team: <strong>{profile.requestedTeam}</strong>
          </p>
        )}
        <Link href="/datenschutz" className="text-sm underline">
          Datenschutzhinweise
        </Link>
      </div>
    </div>
  );
}
