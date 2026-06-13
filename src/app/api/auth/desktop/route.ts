// Endpoint do login social no DESKTOP (navegador externo + loopback).
// Só responde quando: (1) é o app desktop e (2) traz o segredo por execução
// que o Electron injeta — assim só o próprio app consegue chamar.
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import { isDesktopApp } from "@/lib/runtime";
import { getOAuthCredentials } from "@/actions/oauth-config";
import {
  buildAuthUrl,
  createPkce,
  exchangeAndFetchUser,
  randomState,
  type OAuthProvider,
} from "@/modules/auth/infrastructure/desktop-oauth";

// state -> dados do fluxo em andamento (servidor é um único processo)
const pending = new Map<string, { provider: OAuthProvider; verifier?: string; at: number }>();
const TTL = 10 * 60 * 1000;

function gc() {
  const now = Date.now();
  for (const [k, v] of pending) if (now - v.at > TTL) pending.delete(k);
}

function authorized(request: NextRequest): boolean {
  const secret = process.env.DESKTOP_AUTH_SECRET;
  return isDesktopApp() && !!secret && request.headers.get("x-desktop-secret") === secret;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  gc();

  const body = (await request.json()) as { action?: string; provider?: OAuthProvider; code?: string; state?: string };
  const provider = body.provider;
  if (provider !== "google" && provider !== "github") {
    return NextResponse.json({ error: "Provedor inválido" }, { status: 400 });
  }

  const creds = await getOAuthCredentials(provider);
  if (!creds) {
    return NextResponse.json({ error: `Configure as credenciais de ${provider} nas configurações.` }, { status: 400 });
  }

  if (body.action === "start") {
    const state = randomState();
    const pkce = provider === "google" ? createPkce() : null;
    pending.set(state, { provider, verifier: pkce?.verifier, at: Date.now() });
    const authUrl = buildAuthUrl(provider, { clientId: creds.clientId, state, codeChallenge: pkce?.challenge });
    return NextResponse.json({ authUrl, state });
  }

  if (body.action === "finish") {
    const { code, state } = body;
    if (!code || !state) return NextResponse.json({ error: "code/state ausentes" }, { status: 400 });
    const entry = pending.get(state);
    if (!entry || entry.provider !== provider) {
      return NextResponse.json({ error: "Estado inválido ou expirado" }, { status: 400 });
    }
    pending.delete(state);

    try {
      const identity = await exchangeAndFetchUser(provider, {
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        code,
        codeVerifier: entry.verifier,
      });

      let user = await prisma.usuario.findUnique({ where: { email: identity.email } });
      if (!user) {
        const randomPw = await hash(randomBytes(32).toString("hex"), 10);
        user = await prisma.usuario.create({ data: { nome: identity.nome, email: identity.email, senhaHash: randomPw } });
      }
      const sessionToken = await createSessionToken(user.id);
      return NextResponse.json({ sessionToken });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Falha no OAuth" }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
}
