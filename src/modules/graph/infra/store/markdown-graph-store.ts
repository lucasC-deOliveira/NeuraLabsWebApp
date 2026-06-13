import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  applyDomainFromFlashcards,
  type GraphNode,
  type GraphEdge,
} from "@/modules/graph/domain/services/knowledge-graph-builder";
import type { CreateNodeInput, GraphStore } from "./graph-store";
import {
  PARA_FOLDERS,
  nodeRelPath,
  parseNode,
  serializeNode,
  vaultNodeLabel,
  type TipoNode,
  type VaultNode,
} from "./vault-format";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// Backend de sistema de arquivos: o grafo (estrutura) vive num vault Markdown
// no formato PARA. SRS/estudo continuam no banco (modelo híbrido), por id.
export class MarkdownGraphStore implements GraphStore {
  constructor(private readonly vaultPath: string) {}

  /** Lê todos os nós (.md) do vault. */
  private async readAllNodes(): Promise<VaultNode[]> {
    const out: VaultNode[] = [];
    for (const folder of PARA_FOLDERS) {
      const dir = path.join(this.vaultPath, folder);
      let entries: string[] = [];
      try {
        entries = await fs.readdir(dir);
      } catch {
        continue; // pasta ainda não existe
      }
      for (const file of entries) {
        if (!file.endsWith(".md")) continue;
        try {
          const raw = await fs.readFile(path.join(dir, file), "utf8");
          const node = parseNode(raw);
          if (node) out.push(node);
        } catch {
          // arquivo ilegível — ignora
        }
      }
    }
    return out;
  }

  async loadGraph(
    userId: string,
    grafoId?: string,
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const all = await this.readAllNodes();
    const vaultNodes = grafoId ? all.filter((n) => n.grafoId === grafoId) : all;

    const idSet = new Set(vaultNodes.map((n) => n.id));

    const nodes: GraphNode[] = vaultNodes.map((n) => ({
      id: n.id,
      label: vaultNodeLabel(n),
      type: n.tipo as GraphNode["type"],
      nivelDominio: typeof n.nivelDominio === "number" ? n.nivelDominio : 0,
      prioridadeRevisao: 5,
      pergunta: n.tipo === "FLASHCARD" ? n.pergunta : undefined,
    }));

    // arestas: relações de saída de cada nó, com as duas pontas presentes
    const seen = new Set<string>();
    const edges: GraphEdge[] = [];
    for (const n of vaultNodes) {
      for (const r of n.relacoes) {
        if (!idSet.has(r.alvo)) continue;
        const key = `${n.id}→${r.alvo}→${r.rel}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ source: n.id, target: r.alvo, type: r.rel, peso: r.peso });
      }
    }

    // maestria dos flashcards vem do banco (SRS) — modelo híbrido
    const flashcardIds = vaultNodes.filter((n) => n.tipo === "FLASHCARD").map((n) => n.id);
    const mastery = new Map<string, number>();
    if (flashcardIds.length > 0) {
      const aprendizado = await prisma.aprendizadoFlashcard.findMany({
        where: { usuarioId: userId, flashcardId: { in: flashcardIds } },
        select: { flashcardId: true, dificuldade: true },
      });
      const byFc = new Map(aprendizado.map((a) => [a.flashcardId, a.dificuldade]));
      for (const id of flashcardIds) {
        const dif = byFc.get(id);
        mastery.set(id, dif != null ? clamp01(1 - dif / 10) : 0);
      }
    }
    applyDomainFromFlashcards(nodes, edges, mastery);

    return { nodes, edges };
  }

  async createNode(
    userId: string,
    grafoId: string,
    tipoNode: TipoNode,
    input: CreateNodeInput,
  ): Promise<{ nodeId: string }> {
    void userId; // entidades vivem no vault; o id é local ao arquivo
    const id = randomUUID();
    const node: VaultNode = {
      id,
      tipo: tipoNode,
      grafoId,
      nivelDominio: input.nivelDominio ?? 0,
      posicaoX: input.posicaoX ?? null,
      posicaoY: input.posicaoY ?? null,
      criadoEm: new Date().toISOString(),
      relacoes: [],
      nome: input.nome,
      descricao: input.descricao ?? null,
      pergunta: input.pergunta,
      resposta: input.resposta,
      titulo: input.titulo,
      conteudo: input.conteudo,
      tipoNota: input.tipoNota,
      subtipo: input.subtipo,
      fonte: input.fonte ?? null,
      texto: input.texto,
    };
    const rel = nodeRelPath(node);
    const full = path.join(this.vaultPath, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, serializeNode(node), "utf8");
    return { nodeId: id };
  }
}
