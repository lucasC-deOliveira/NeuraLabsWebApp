"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { isDesktopApp } from "@/lib/runtime";
import { DESKTOP_OAUTH_REDIRECT, type OAuthProvider } from "@/modules/auth/infrastructure/desktop-oauth";

const SINGLETON_ID = "singleton";
const DESKTOP_ONLY = "O login social no app só está disponível no desktop.";

export interface OAuthConfigStatus {
  google: boolean;
  github: boolean;
  redirectUri: string;
}

/** Quais provedores estão configurados (sem expor segredos) + o redirect a registrar. */
export async function getOAuthConfig(): Promise<OAuthConfigStatus> {
  const row = await prisma.appConfig.findUnique({ where: { id: SINGLETON_ID } });
  return {
    google: !!(row?.googleClientId && row?.googleClientSecret),
    github: !!(row?.githubClientId && row?.githubClientSecret),
    redirectUri: DESKTOP_OAUTH_REDIRECT,
  };
}

export interface SetOAuthConfigInput {
  googleClientId?: string;
  googleClientSecret?: string;
  githubClientId?: string;
  githubClientSecret?: string;
}

/** Salva as credenciais OAuth (somente no desktop). Strings vazias limpam o campo. */
export async function setOAuthConfig(input: SetOAuthConfigInput): Promise<{ success: boolean }> {
  await requireUserId();
  if (!isDesktopApp()) throw new Error(DESKTOP_ONLY);

  const clean = (v?: string) => (v === undefined ? undefined : v.trim() || null);
  const data = {
    googleClientId: clean(input.googleClientId),
    googleClientSecret: clean(input.googleClientSecret),
    githubClientId: clean(input.githubClientId),
    githubClientSecret: clean(input.githubClientSecret),
  };

  await prisma.appConfig.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
  });
  revalidatePath("/settings");
  return { success: true };
}

/** Credenciais de um provedor (uso interno do endpoint de OAuth desktop). */
export async function getOAuthCredentials(
  provider: OAuthProvider,
): Promise<{ clientId: string; clientSecret: string } | null> {
  const row = await prisma.appConfig.findUnique({ where: { id: SINGLETON_ID } });
  if (!row) return null;
  const id = provider === "google" ? row.googleClientId : row.githubClientId;
  const secret = provider === "google" ? row.googleClientSecret : row.githubClientSecret;
  return id && secret ? { clientId: id, clientSecret: secret } : null;
}
