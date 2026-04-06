import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/",
  "/flashcards",
  "/notes",
  "/study",
  "/graph",
  "/settings",
  "/reviews",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets, API, auth pages
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico" ||
    pathname === "/login" ||
    pathname === "/register"
  ) {
    return NextResponse.next();
  }

  // Check cookie
  const token = request.cookies.get("flashmind_session");

  // Not authenticated — redirect all protected routes to /login
  if (!token) {
    const isProtected = PROTECTED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    if (isProtected) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Already logged in on login/register — redirect to /
  if (token && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.*|apple.*).*)"],
};
