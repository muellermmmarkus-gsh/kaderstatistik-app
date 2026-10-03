import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthFormRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isPublicRoute =
    isAuthFormRoute ||
    pathname.startsWith("/auth/confirm") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/datenschutz");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthFormRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Zugriff nur fuer freigegebene Trainer mit Team. Alle anderen (nicht
  // freigegeben, Team noch nicht genehmigt, Eltern/Spieler) sehen nur die
  // Warteseite. Die Daten selbst schuetzt die Row-Level-Security
  // (is_member()/current_team_id() in migration_033).
  if (user && !isPublicRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, team_id")
      .eq("id", user.id)
      .maybeSingle();
    const hasAccess = profile?.role === "trainer" && !!profile.team_id;
    const onPendingPage = pathname.startsWith("/pending");

    if (hasAccess === onPendingPage) {
      const url = request.nextUrl.clone();
      url.pathname = hasAccess ? "/" : "/pending";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
