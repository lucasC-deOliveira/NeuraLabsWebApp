import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "neuralabs_session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and API routes unconditionally
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isAuthPage) {
    // Redirect already-authenticated users away from auth pages
    if (token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // All other routes require authentication
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
