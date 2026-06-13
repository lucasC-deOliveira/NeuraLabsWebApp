"use server";

import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { exportGraphToVault } from "@/modules/graph/infra/store/vault-export";
import { importVaultToDatabase } from "@/modules/graph/infra/store/vault-import";
import { initVault } from "@/modules/graph/infra/store/vault-guide";
import { isDesktopApp } from "@/lib/runtime";

const DESKTOP_ONLY = "O armazenamento em arquivos (Markdown) só está disponível no app desktop.";

/** Para a UI saber se o modo de arquivos pode ser oferecido. */
export async function isDesktopRuntime(): Promise<boolean> {
  return isDesktopApp();
}

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
    if (!isDesktopApp()) throw new Error(DESKTOP_ONLY);
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
    // cria as pastas PARA e escreve o guia para o Claude Code modelar o grafo
    await initVault(vaultPath);
  }

  await prisma.appConfig.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, storageMode, vaultPath },
    update: { storageMode, vaultPath },
  });

  revalidatePath("/settings");
  return { success: true };
}

export interface DirListing {
  path: string;
  parent: string | null;
  dirs: { name: string; path: string }[];
}

/**
 * Navegador de pastas do servidor (a máquina onde o app roda) para o picker do
 * vault. Lista as subpastas de `dirPath` (padrão: home do usuário do SO).
 */
export async function browseDirectory(dirPath?: string): Promise<DirListing> {
  await requireUserId();
  if (!isDesktopApp()) throw new Error(DESKTOP_ONLY);
  const target = dirPath && dirPath.trim() && path.isAbsolute(dirPath) ? path.resolve(dirPath) : os.homedir();
  let entries: import("fs").Dirent[] = [];
  try {
    entries = await fs.readdir(target, { withFileTypes: true });
  } catch {
    throw new Error(`Não foi possível abrir "${target}".`);
  }
  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => ({ name: e.name, path: path.join(target, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const parent = path.dirname(target);
  return { path: target, parent: parent === target ? null : parent, dirs };
}

/**
 * Exporta todo o grafo do usuário (banco → vault Markdown PARA) na pasta
 * configurada. Útil para inspecionar/migrar e para validar o formato.
 */
export async function exportToVault(): Promise<{ nodes: number; vaultPath: string }> {
  const userId = await requireUserId();
  if (!isDesktopApp()) throw new Error(DESKTOP_ONLY);
  const config = await getStorageConfig();
  const vaultPath = config.vaultPath?.trim();
  if (!vaultPath) {
    throw new Error("Configure a pasta do vault (modo Markdown) antes de exportar.");
  }
  const result = await exportGraphToVault(userId, vaultPath);
  return { nodes: result.nodes, vaultPath };
}

/**
 * Importa o vault Markdown de volta para o banco (migração arquivos → banco).
 * Idempotente — preserva ids. Útil ao voltar do modo arquivos para o banco.
 */
export async function importFromVault(): Promise<{ nodes: number; edges: number; vaultPath: string }> {
  const userId = await requireUserId();
  if (!isDesktopApp()) throw new Error(DESKTOP_ONLY);
  const config = await getStorageConfig();
  const vaultPath = config.vaultPath?.trim();
  if (!vaultPath) {
    throw new Error("Configure a pasta do vault (modo Markdown) antes de importar.");
  }
  const result = await importVaultToDatabase(userId, vaultPath);
  return { ...result, vaultPath };
}
