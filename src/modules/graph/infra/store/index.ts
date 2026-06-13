import { getStorageConfig } from "@/actions/storage-config";
import { isDesktopApp } from "@/lib/runtime";
import type { GraphStore } from "./graph-store";
import { PrismaGraphStore } from "./prisma-graph-store";
import { MarkdownGraphStore } from "./markdown-graph-store";

export type { GraphStore } from "./graph-store";

const prismaStore = new PrismaGraphStore();

/**
 * Devolve o backend de persistência do grafo conforme a config global:
 * banco (Prisma) ou sistema de arquivos (vault Markdown PARA).
 *
 * O modo MARKDOWN só vale no app desktop (fs = máquina do usuário). Fora do
 * desktop, ou sem pasta válida, cai sempre no banco. SRS/estudo, login e a
 * lista/metadados de grafos seguem sempre no banco.
 */
export async function getGraphStore(): Promise<GraphStore> {
  if (!isDesktopApp()) return prismaStore;
  const config = await getStorageConfig().catch(() => null);
  if (config?.storageMode === "MARKDOWN" && config.vaultPath) {
    return new MarkdownGraphStore(config.vaultPath);
  }
  return prismaStore;
}

/** True se o grafo está sendo guardado em arquivos (modo Markdown ativo). */
export async function isMarkdownMode(): Promise<boolean> {
  if (!isDesktopApp()) return false;
  const config = await getStorageConfig().catch(() => null);
  return config?.storageMode === "MARKDOWN" && !!config.vaultPath;
}
