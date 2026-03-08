import { createClient } from "@/lib/supabase/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/signup", "/auth/callback"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createClient(request, response);
  const pathname = request.nextUrl.pathname;

  // Skip public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    await supabase.auth.getUser();
    return response;
  }

  // Let API routes through after auth check — they handle their own authorization
  if (pathname.startsWith("/api/")) {
    await supabase.auth.getUser();
    return response;
  }

  // Refresh session and get user
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = user.app_metadata?.role;
  const userTenantId = user.app_metadata?.tenant_id;

  // Onboarding redirect: users with onboarding_completed === false
  // must complete onboarding before accessing the app.
  // Super admins are exempt (they don't go through onboarding).
  if (
    user.app_metadata?.onboarding_completed === false &&
    role !== "super_admin" &&
    !pathname.startsWith("/onboarding/confirm-tenant") &&
    !pathname.startsWith("/onboarding/set-password") &&
    !pathname.startsWith("/api/auth/callback")
  ) {
    return NextResponse.redirect(
      new URL("/onboarding/confirm-tenant", request.url)
    );
  }

  // Skip tenant resolution for onboarding routes (user is authenticated but
  // tenant setup may not be finalized yet)
  if (pathname.startsWith("/onboarding/")) {
    return response;
  }

  // Handle /admin routes
  if (pathname.startsWith("/admin")) {
    if (role !== "super_admin") {
      if (userTenantId) {
        return NextResponse.redirect(new URL(`/${userTenantId}`, request.url));
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // Handle root path
  if (pathname === "/") {
    if (role === "super_admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (userTenantId) {
      // Look up tenant slug for clean URLs
      const { data: tenant } = await supabase
        .from("tenants")
        .select("slug")
        .eq("id", userTenantId)
        .single();
      const target = tenant?.slug || userTenantId;
      return NextResponse.redirect(new URL(`/${target}`, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Extract orgId from path
  const pathSegments = pathname.split("/").filter(Boolean);
  const orgId = pathSegments[0];

  if (orgId) {
    let resolvedTenantId = orgId;

    if (role !== "super_admin") {
      // orgId may be a UUID or a tenant slug — resolve to UUID for comparison
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);

      if (!isUuid) {
        // Look up tenant UUID by slug
        const { data: tenant } = await supabase
          .from("tenants")
          .select("id")
          .eq("slug", orgId)
          .single();
        resolvedTenantId = tenant?.id ?? orgId;
      }

      if (userTenantId !== resolvedTenantId) {
        if (userTenantId) {
          return NextResponse.redirect(new URL(`/${userTenantId}`, request.url));
        }
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }
    response.headers.set("x-tenant-id", resolvedTenantId);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
