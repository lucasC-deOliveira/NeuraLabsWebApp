import { getStorageConfig } from "@/actions/storage-config";
import type { GraphStore } from "./graph-store";
import { PrismaGraphStore } from "./prisma-graph-store";

export type { GraphStore } from "./graph-store";

const prismaStore = new PrismaGraphStore();

/**
 * Devolve o backend de persistência do grafo conforme a config global.
 *
 * Fase 1+2: o modo MARKDOWN ainda não tem backend, então cai no banco (com
 * aviso). As fases seguintes adicionam o MarkdownGraphStore e o trocam aqui.
 */
export async function getGraphStore(): Promise<GraphStore> {
  const config = await getStorageConfig().catch(() => null);
  if (config?.storageMode === "MARKDOWN") {
    console.warn(
      "[graph-store] modo MARKDOWN selecionado, mas o backend de arquivos ainda não foi implementado — usando o banco por enquanto.",
    );
  }
  return prismaStore;
}
