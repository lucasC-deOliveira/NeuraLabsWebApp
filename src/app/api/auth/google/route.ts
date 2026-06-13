import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  // sem credenciais configuradas (ex.: app desktop) não há OAuth — evita
  // redirecionar ao Google com client_id vazio (erro "invalid_client").
  if (!process.env.AUTH_GOOGLE_ID) {
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

  const state = randomBytes(16).toString("hex");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.AUTH_GOOGLE_ID!);
  url.searchParams.set(
    "redirect_uri",
    `${request.nextUrl.origin}/api/auth/google/callback`,
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url);
  response.cookies.set("oauth_callback_url", callbackUrl, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 5,
    path: "/",
  });
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 5,
    path: "/",
  });
  return response;
}
