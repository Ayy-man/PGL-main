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
      return NextResponse.redirect(new URL(`/${userTenantId}`, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Extract orgId from path
  const pathSegments = pathname.split("/").filter(Boolean);
  const orgId = pathSegments[0];

  if (orgId) {
    if (role !== "super_admin" && userTenantId !== orgId) {
      if (userTenantId) {
        return NextResponse.redirect(new URL(`/${userTenantId}`, request.url));
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
    response.headers.set("x-tenant-id", orgId);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
