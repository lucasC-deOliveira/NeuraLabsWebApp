import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { createSessionToken, setSessionCookieResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  const rawCallback = request.cookies.get("oauth_callback_url")?.value ?? "/";
  const callbackUrl =
    rawCallback.startsWith("/") && !rawCallback.startsWith("//")
      ? rawCallback
      : "/";

  const expectedState = request.cookies.get("oauth_state")?.value;

  if (error || !code) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  // CSRF: verify state parameter
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      redirect_uri: `${request.nextUrl.origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.access_token) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  // Fetch user info
  const userRes = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
  );

  if (!userRes.ok) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  const googleUser = await userRes.json();
  const email: string =
    googleUser.email ?? `google-${googleUser.sub}@oauth.neuralabs.app`;
  const nome: string =
    googleUser.name ?? googleUser.given_name ?? "Google User";

  // Upsert user
  let existingUser = await prisma.usuario.findUnique({ where: { email } });

  if (!existingUser) {
    const randomPw = await hash(randomBytes(32).toString("hex"), 10);
    existingUser = await prisma.usuario.create({
      data: { nome, email, senhaHash: randomPw },
    });
  }

  // Create session and clear OAuth cookies
  const response = NextResponse.redirect(new URL(callbackUrl, request.url));
  const token = await createSessionToken(existingUser.id);
  setSessionCookieResponse(response, token);
  response.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });
  response.cookies.set("oauth_callback_url", "", { maxAge: 0, path: "/" });
  return response;
}
