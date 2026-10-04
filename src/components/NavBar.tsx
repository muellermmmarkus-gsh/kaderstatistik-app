import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { signOut } from "@/app/login/actions";
import NavMenu from "./NavMenu";
import TeamSwitcher from "./TeamSwitcher";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await getCurrentProfile();
  const hasAccess = profile?.role === "trainer" && !!profile.teamId;
  // Admin: Teamauswahl statt fester Anzeige.
  const { data: teams } =
    hasAccess && profile?.isAdmin
      ? await supabase.from("teams").select("id, name").order("name")
      : { data: null };

  return (
    <nav className="relative flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div className="flex min-w-0 items-center gap-2 lg:gap-4">
        {hasAccess ? <NavMenu isTrainer /> : <span />}
        {hasAccess && teams && teams.length > 1 ? (
          <TeamSwitcher teams={teams} currentTeamId={profile!.teamId!} />
        ) : (
          hasAccess &&
          profile?.teamName && (
            <span className="truncate rounded bg-[#1f4d2c] px-2.5 py-1 text-sm font-semibold text-white">
              {profile.teamName}
            </span>
          )
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <form action={signOut}>
          <button
            type="submit"
            title={user.email}
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            Abmelden<span className="hidden xl:inline"> ({user.email})</span>
          </button>
        </form>
        {profile?.isAdmin && (
          <Link
            href="/admin"
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            ADMIN
          </Link>
        )}
      </div>
    </nav>
  );
}
