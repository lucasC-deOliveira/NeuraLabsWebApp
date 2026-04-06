"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

async function resolveUserId(): Promise<string> {
  const user = await prisma.usuario.findFirst({ select: { id: true } });
  if (!user) {
    throw new Error("No user configured -- set up auth");
  }
  return user.id;
}

export interface ConfigAIData {
  apiKey: string;
  baseUrl: string;
  modelo: string;
}

export async function getConfigAI(): Promise<ConfigAIData | null> {
  const userId = await resolveUserId();
  const config = await prisma.configAI.findUnique({
    where: { usuarioId: userId },
  });
  if (!config) return null;
  return { apiKey: config.apiKey, baseUrl: config.baseUrl, modelo: config.modelo };
}

export async function saveConfigAI(
  data: ConfigAIData,
): Promise<{ success: boolean }> {
  const userId = await resolveUserId();
  await prisma.configAI.upsert({
    where: { usuarioId: userId },
    create: { usuarioId: userId, ...data },
    update: data,
  });
  revalidatePath("/settings");
  return { success: true };
}

/**
 * Resolve AI config: DB first, fallback to env vars.
 */
export async function resolveAIConfig(): Promise<{
  apiKey: string;
  baseUrl: string;
  model: string;
}> {
  const dbConfig = await getConfigAI().catch(() => null);
  return {
    apiKey: dbConfig?.apiKey ?? process.env.OPENAI_API_KEY ?? "",
    baseUrl: dbConfig?.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    model: dbConfig?.modelo ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  };
}
