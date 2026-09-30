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

  // Noch nicht freigeschaltete Nutzer (Rolle "pending") sehen nur die
  // Warteseite. Die Daten selbst schuetzt die Row-Level-Security.
  if (user && !isPublicRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const isPending = !profile || profile.role === "pending";
    const onPendingPage = pathname.startsWith("/pending");

    if (isPending !== onPendingPage) {
      const url = request.nextUrl.clone();
      url.pathname = isPending ? "/pending" : "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
