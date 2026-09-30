import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/supabase/profile";
import { signOut } from "@/app/login/actions";
import NavMenu from "./NavMenu";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const role = await getCurrentRole();
  const canSeeAdmin = role === "trainer";

  return (
    <nav className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      {canSeeAdmin ? <NavMenu isTrainer /> : <span />}
      <div className="flex items-center gap-4">
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            Abmelden ({user.email})
          </button>
        </form>
        {canSeeAdmin && (
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
