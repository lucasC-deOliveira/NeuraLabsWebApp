import { NextRequest, NextResponse } from "next/server";

// Initiate GitHub OAuth flow — redirect to GitHub
export async function GET(request: NextRequest) {
  // sem credenciais configuradas (ex.: app desktop) não há OAuth
  if (!process.env.AUTH_GITHUB_ID) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_indisponivel", request.nextUrl.origin),
    );
  }
  const rawCallback =
    request.nextUrl.searchParams.get("callbackUrl") ?? "/";
  const callbackUrl =
    rawCallback.startsWith("/") && !rawCallback.startsWith("//")
      ? rawCallback
      : "/";
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", process.env.AUTH_GITHUB_ID!);
  url.searchParams.set("redirect_uri", `${request.nextUrl.origin}/api/auth/github/callback`);
  url.searchParams.set("scope", "user:email");
  // Store callbackUrl for use in callback
  const redirectResponse = NextResponse.redirect(url);
  redirectResponse.cookies.set("oauth_callback_url", callbackUrl, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 5,
    path: "/",
  });
  return redirectResponse;
}
