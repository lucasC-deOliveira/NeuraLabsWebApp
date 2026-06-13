"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { exportGraphToVault } from "@/modules/graph/infra/store/vault-export";

export type StorageMode = "DATABASE" | "MARKDOWN";

export interface StorageConfig {
  storageMode: StorageMode;
  vaultPath: string | null;
}

const SINGLETON_ID = "singleton";
const DEFAULT_CONFIG: StorageConfig = { storageMode: "DATABASE", vaultPath: null };

/**
 * Config global de armazenamento do grafo (singleton). Cria o padrão (banco)
 * se ainda não existir.
 */
export async function getStorageConfig(): Promise<StorageConfig> {
  const row = await prisma.appConfig.findUnique({ where: { id: SINGLETON_ID } });
  if (!row) return DEFAULT_CONFIG;
  const mode: StorageMode = row.storageMode === "MARKDOWN" ? "MARKDOWN" : "DATABASE";
  return { storageMode: mode, vaultPath: row.vaultPath ?? null };
}

/**
 * Define onde o grafo é guardado. No modo MARKDOWN exige uma pasta (vaultPath)
 * existente/criável e gravável.
 */
export async function setStorageConfig(input: StorageConfig): Promise<{ success: boolean }> {
  await requireUserId();

  const storageMode: StorageMode = input.storageMode === "MARKDOWN" ? "MARKDOWN" : "DATABASE";
  let vaultPath: string | null = null;

  if (storageMode === "MARKDOWN") {
    const raw = (input.vaultPath ?? "").trim();
    if (!raw) throw new Error("Escolha a pasta onde o grafo será guardado (Markdown).");
    if (!path.isAbsolute(raw)) throw new Error("O caminho da pasta deve ser absoluto.");
    vaultPath = path.resolve(raw);
    // garante que a pasta existe e é gravável (cria se preciso)
    try {
      await fs.mkdir(vaultPath, { recursive: true });
      await fs.access(vaultPath, fs.constants.W_OK);
    } catch {
      throw new Error(`Não foi possível usar a pasta "${vaultPath}" (verifique permissões).`);
    }
  }

  await prisma.appConfig.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, storageMode, vaultPath },
    update: { storageMode, vaultPath },
  });

  revalidatePath("/settings");
  return { success: true };
}

/**
 * Exporta todo o grafo do usuário (banco → vault Markdown PARA) na pasta
 * configurada. Útil para inspecionar/migrar e para validar o formato.
 */
export async function exportToVault(): Promise<{ nodes: number; vaultPath: string }> {
  const userId = await requireUserId();
  const config = await getStorageConfig();
  const vaultPath = config.vaultPath?.trim();
  if (!vaultPath) {
    throw new Error("Configure a pasta do vault (modo Markdown) antes de exportar.");
  }
  const result = await exportGraphToVault(userId, vaultPath);
  return { nodes: result.nodes, vaultPath };
}
