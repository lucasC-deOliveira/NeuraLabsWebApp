import { createHash, randomBytes } from "crypto";

// Login social no DESKTOP via navegador externo + loopback.
// O Electron sobe um servidor nesta porta fixa para capturar o retorno; o
// mesmo redirect deve ser registrado no console do Google e do GitHub.
export const DESKTOP_OAUTH_PORT = 8765;
export const DESKTOP_OAUTH_REDIRECT = `http://127.0.0.1:${DESKTOP_OAUTH_PORT}/callback`;

export type OAuthProvider = "google" | "github";

// ---- PKCE (Google) ----
const base64url = (buf: Buffer) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function createPkce(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function randomState(): string {
  return randomBytes(16).toString("hex");
}

// ---- URL de autorização ----
export function buildAuthUrl(
  provider: OAuthProvider,
  opts: { clientId: string; state: string; codeChallenge?: string },
): string {
  if (provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", opts.clientId);
    url.searchParams.set("redirect_uri", DESKTOP_OAUTH_REDIRECT);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", opts.state);
    if (opts.codeChallenge) {
      url.searchParams.set("code_challenge", opts.codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
    }
    return url.toString();
  }
  // github
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("redirect_uri", DESKTOP_OAUTH_REDIRECT);
  url.searchParams.set("scope", "user:email");
  url.searchParams.set("state", opts.state);
  return url.toString();
}

// ---- Troca do code por token + dados do usuário ----
export interface OAuthIdentity {
  email: string;
  nome: string;
}

export async function exchangeAndFetchUser(
  provider: OAuthProvider,
  opts: { clientId: string; clientSecret: string; code: string; codeVerifier?: string },
): Promise<OAuthIdentity> {
  if (provider === "google") {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: opts.code,
        client_id: opts.clientId,
        client_secret: opts.clientSecret,
        redirect_uri: DESKTOP_OAUTH_REDIRECT,
        grant_type: "authorization_code",
        ...(opts.codeVerifier ? { code_verifier: opts.codeVerifier } : {}),
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) throw new Error("Falha ao trocar o code (Google)");
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) throw new Error("Falha ao obter o usuário (Google)");
    const u = await userRes.json();
    return {
      email: u.email ?? `google-${u.sub}@oauth.neuralabs.app`,
      nome: u.name ?? u.given_name ?? "Google User",
    };
  }

  // github
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      code: opts.code,
      redirect_uri: DESKTOP_OAUTH_REDIRECT,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) throw new Error("Falha ao trocar o code (GitHub)");
  const headers = { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "NeuraLabs" };
  const userRes = await fetch("https://api.github.com/user", { headers });
  if (!userRes.ok) throw new Error("Falha ao obter o usuário (GitHub)");
  const u = await userRes.json();
  let email: string | undefined = u.email ?? undefined;
  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
    if (emailsRes.ok) {
      const emails = await emailsRes.json();
      const primary = Array.isArray(emails) ? emails.find((e: { primary?: boolean; email: string }) => e.primary) ?? emails[0] : null;
      email = primary?.email;
    }
  }
  return {
    email: email ?? `github-${u.id}@oauth.neuralabs.app`,
    nome: u.name ?? u.login ?? "GitHub User",
  };
}
