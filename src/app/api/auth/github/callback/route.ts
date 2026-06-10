import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { createSessionToken, setSessionCookieResponse } from "@/lib/auth";

// Handle GitHub OAuth callback
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const rawCallback = request.cookies.get("oauth_callback_url")?.value ?? "/";
  // Reject absolute URLs and protocol-relative paths to prevent open redirect.
  const callbackUrl =
    rawCallback.startsWith("/") && !rawCallback.startsWith("//")
      ? rawCallback
      : "/";

  if (error || !code) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.AUTH_GITHUB_ID,
      client_secret: process.env.AUTH_GITHUB_SECRET,
      code,
      redirect_uri: `${request.nextUrl.origin}/api/auth/github/callback`,
    }),
  });

  const tokenData = await tokenRes.json();

  if (tokenData.error || !tokenData.access_token) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  // Fetch user info
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  const githubUser = await userRes.json();

  // Fetch email (may be separate call)
  let email = githubUser.email;
  if (!email) {
    const emailRes = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (emailRes.ok) {
      const emails = await emailRes.json();
      email = emails.find((e: any) => e.primary)?.email ?? null;
    }
  }

  if (!email) {
    email = `github-${githubUser.id}@oauth.flashmind.app`;
  }

  // Upsert user
  let existingUser = await prisma.usuario.findUnique({ where: { email } });

  if (!existingUser) {
    const randomPw = await hash(randomBytes(32).toString("hex"), 10);
    existingUser = await prisma.usuario.create({
      data: {
        nome: githubUser.name ?? githubUser.login ?? "GitHub User",
        email,
        senhaHash: randomPw,
      },
    });
  }

  // Create session
  const response = NextResponse.redirect(new URL(callbackUrl, request.url));
  const token = await createSessionToken(existingUser.id);
  setSessionCookieResponse(response, token);
  return response;
}
