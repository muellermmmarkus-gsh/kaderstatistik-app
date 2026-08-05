import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import NavMenu from "./NavMenu";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <nav className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <NavMenu />
      <form action={signOut}>
        <button
          type="submit"
          className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
        >
          Abmelden ({user.email})
        </button>
      </form>
    </nav>
  );
}
