// ---------------------------------------------------------------------------
// Next.js Middleware — protects app routes, redirects to /login
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";

const AUTH_ROUTES = ["/login", "/register"];
const PROTECTED_PREFIXES = [
  "/flashcards",
  "/notes",
  "/study",
  "/graph",
  "/settings",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets/API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("flashmind_session")?.value;
  const isAuthenticated = !!token;

  // Redirect authenticated users away from login/register → /
  if (isAuthenticated && AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect unauthenticated users to /login for protected routes
  if (!isAuthenticated) {
    const isPublic = pathname === "/" || pathname.startsWith("/api/");
    if (!isPublic || ProtectedRoute(pathname)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

function ProtectedRoute(pathname: string): boolean {
  return (
    PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/reviews")
  );
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - Static files (/_next/static, /_next/image, /favicon.ico, /icon*, /apple*)
     * - Image optimization
     */
    "/((?!_next/static|_next/image|favicon.ico|icon*|apple*).*)",
  ],
};
