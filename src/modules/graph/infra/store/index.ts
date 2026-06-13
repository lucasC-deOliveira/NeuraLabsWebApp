import { getStorageConfig } from "@/actions/storage-config";
import type { GraphStore } from "./graph-store";
import { PrismaGraphStore } from "./prisma-graph-store";
import { MarkdownGraphStore } from "./markdown-graph-store";

export type { GraphStore } from "./graph-store";

const prismaStore = new PrismaGraphStore();

/**
 * Devolve o backend de persistência do grafo conforme a config global:
 * banco (Prisma) ou sistema de arquivos (vault Markdown PARA).
 *
 * No modo MARKDOWN sem pasta válida, cai no banco (defensivo).
 * SRS/estudo, login e a lista/metadados de grafos seguem sempre no banco.
 */
export async function getGraphStore(): Promise<GraphStore> {
  const config = await getStorageConfig().catch(() => null);
  if (config?.storageMode === "MARKDOWN" && config.vaultPath) {
    return new MarkdownGraphStore(config.vaultPath);
  }
  return prismaStore;
}

/** True se o grafo está sendo guardado em arquivos (modo Markdown ativo). */
export async function isMarkdownMode(): Promise<boolean> {
  const config = await getStorageConfig().catch(() => null);
  return config?.storageMode === "MARKDOWN" && !!config.vaultPath;
}
