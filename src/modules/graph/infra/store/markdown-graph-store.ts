import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  applyDomainFromFlashcards,
  type GraphNode,
  type GraphEdge,
  type TipoRelacao,
} from "@/modules/graph/domain/services/knowledge-graph-builder";
import { getAllowedRelations, isRelationAllowed } from "@/modules/graph/domain/services/relation-rules";
import type { CreateEdgeInput, CreateNodeInput, EdgeView, GraphStore, UpdateNodeInput } from "./graph-store";
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

  // localiza o arquivo de um nó pelo sufixo --<id>.md
  private async findNodeFile(id: string): Promise<string | null> {
    for (const folder of PARA_FOLDERS) {
      const dir = path.join(this.vaultPath, folder);
      let entries: string[] = [];
      try {
        entries = await fs.readdir(dir);
      } catch {
        continue;
      }
      const hit = entries.find((f) => f.endsWith(`--${id}.md`));
      if (hit) return path.join(dir, hit);
    }
    return null;
  }

  private async readNodeWithPath(id: string): Promise<{ node: VaultNode; full: string } | null> {
    const full = await this.findNodeFile(id);
    if (!full) return null;
    const node = parseNode(await fs.readFile(full, "utf8"));
    return node ? { node, full } : null;
  }

  async getEdges(userId: string, grafoId: string): Promise<EdgeView[]> {
    void userId;
    const all = await this.readAllNodes();
    const inGraph = all.filter((n) => n.grafoId === grafoId);
    const byId = new Map(inGraph.map((n) => [n.id, n]));
    const out: EdgeView[] = [];
    for (const n of inGraph) {
      for (const r of n.relacoes) {
        const target = byId.get(r.alvo);
        if (!target) continue;
        out.push({
          id: `${n.id}|${r.alvo}|${r.rel}`,
          source: n.id,
          target: r.alvo,
          tipoRelacao: r.rel,
          peso: r.peso,
          sourceLabel: vaultNodeLabel(n),
          targetLabel: vaultNodeLabel(target),
        });
      }
    }
    return out;
  }

  async createEdge(
    userId: string,
    grafoId: string,
    input: CreateEdgeInput,
  ): Promise<{ edgeId: string }> {
    void userId;
    if (
      input.peso !== undefined &&
      (typeof input.peso !== "number" || !Number.isFinite(input.peso) || input.peso <= 0 || input.peso > 2)
    ) {
      throw new Error("Peso da relação inválido (use um número entre 0 e 2)");
    }
    const src = await this.readNodeWithPath(input.sourceNodeId);
    const tgt = await this.readNodeWithPath(input.targetNodeId);
    if (!src || !tgt || src.node.grafoId !== grafoId || tgt.node.grafoId !== grafoId) {
      throw new Error("Um ou ambos os nós não encontrados no grafo");
    }
    if (!isRelationAllowed(src.node.tipo, tgt.node.tipo, input.tipoRelacao)) {
      const allowed = getAllowedRelations(src.node.tipo, tgt.node.tipo);
      throw new Error(
        allowed.length === 0
          ? `Nós do tipo ${src.node.tipo} e ${tgt.node.tipo} não podem ser relacionados`
          : `Relação ${input.tipoRelacao} não é permitida entre ${src.node.tipo} e ${tgt.node.tipo}. Permitidas: ${allowed.join(", ")}`,
      );
    }
    if (src.node.relacoes.some((r) => r.alvo === input.targetNodeId && r.rel === input.tipoRelacao)) {
      throw new Error("Relação já existe entre esses nós com este tipo");
    }
    src.node.relacoes.push({ rel: input.tipoRelacao, alvo: input.targetNodeId, peso: input.peso ?? 1.0 });
    await fs.writeFile(src.full, serializeNode(src.node), "utf8");
    return { edgeId: `${input.sourceNodeId}|${input.targetNodeId}|${input.tipoRelacao}` };
  }

  async updateEdge(
    userId: string,
    grafoId: string,
    edgeId: string,
    data: { tipoRelacao?: TipoRelacao; peso?: number },
  ): Promise<void> {
    void userId;
    void grafoId;
    const [source, target, rel] = edgeId.split("|");
    const src = await this.readNodeWithPath(source);
    if (!src) throw new Error("Relação não encontrada");
    const idx = src.node.relacoes.findIndex((r) => r.alvo === target && r.rel === rel);
    if (idx < 0) throw new Error("Relação não encontrada");
    if (data.tipoRelacao && data.tipoRelacao !== rel) {
      const tgt = await this.readNodeWithPath(target);
      if (tgt && !isRelationAllowed(src.node.tipo, tgt.node.tipo, data.tipoRelacao)) {
        throw new Error(`Relação ${data.tipoRelacao} não é permitida entre ${src.node.tipo} e ${tgt.node.tipo}`);
      }
      src.node.relacoes[idx].rel = data.tipoRelacao;
    }
    if (data.peso !== undefined) src.node.relacoes[idx].peso = data.peso;
    await fs.writeFile(src.full, serializeNode(src.node), "utf8");
  }

  async deleteEdge(userId: string, grafoId: string, edgeId: string): Promise<void> {
    void userId;
    void grafoId;
    const [source, target, rel] = edgeId.split("|");
    const src = await this.readNodeWithPath(source);
    if (!src) return;
    src.node.relacoes = src.node.relacoes.filter((r) => !(r.alvo === target && r.rel === rel));
    await fs.writeFile(src.full, serializeNode(src.node), "utf8");
  }

  // lista os arquivos de nós com caminho (para varreduras)
  private async listNodeFiles(): Promise<{ node: VaultNode; full: string }[]> {
    const out: { node: VaultNode; full: string }[] = [];
    for (const folder of PARA_FOLDERS) {
      const dir = path.join(this.vaultPath, folder);
      let entries: string[] = [];
      try {
        entries = await fs.readdir(dir);
      } catch {
        continue;
      }
      for (const file of entries) {
        if (!file.endsWith(".md")) continue;
        const full = path.join(dir, file);
        try {
          const node = parseNode(await fs.readFile(full, "utf8"));
          if (node) out.push({ node, full });
        } catch {
          // ignora
        }
      }
    }
    return out;
  }

  async deleteNode(userId: string, refId: string, grafoId?: string): Promise<{ deletedType: string }> {
    void grafoId;
    const target = await this.readNodeWithPath(refId);
    if (!target) throw new Error("Node não encontrado no grafo");
    const tipo = target.node.tipo;

    // apaga o arquivo do nó
    await fs.rm(target.full, { force: true });

    // remove relações de ENTRADA (arestas que apontam para ele) em outros nós
    for (const { node, full } of await this.listNodeFiles()) {
      if (node.id === refId) continue;
      const before = node.relacoes.length;
      node.relacoes = node.relacoes.filter((r) => r.alvo !== refId);
      if (node.relacoes.length !== before) {
        await fs.writeFile(full, serializeNode(node), "utf8");
      }
    }

    // SRS continua no banco (híbrido): limpa o do flashcard removido
    if (tipo === "FLASHCARD") {
      await prisma.revisaoFlashcard.deleteMany({ where: { flashcardId: refId } });
      await prisma.aprendizadoFlashcard.deleteMany({ where: { flashcardId: refId, usuarioId: userId } });
    }

    return { deletedType: tipo };
  }

  async updateNode(
    userId: string,
    tipoNode: TipoNode,
    refId: string,
    data: UpdateNodeInput,
  ): Promise<void> {
    void userId;
    void tipoNode;
    const target = await this.readNodeWithPath(refId);
    if (!target) throw new Error("Nó não encontrado ou não pertence ao usuário");
    const n = target.node;
    if (data.nome !== undefined) n.nome = data.nome;
    if (data.descricao !== undefined) n.descricao = data.descricao;
    if (data.pergunta !== undefined) n.pergunta = data.pergunta;
    if (data.resposta !== undefined) n.resposta = data.resposta;
    if (data.titulo !== undefined) n.titulo = data.titulo.trim();
    if (data.conteudo !== undefined) n.conteudo = data.conteudo;
    if (data.tipoNota !== undefined) n.tipoNota = data.tipoNota;
    if (data.subtipo !== undefined) n.subtipo = data.subtipo;
    if (data.fonte !== undefined) n.fonte = data.fonte?.trim() || null;
    if (data.texto !== undefined) n.texto = data.texto.trim();
    await fs.writeFile(target.full, serializeNode(n), "utf8");
  }

  async getNodeDetails(
    userId: string,
    tipoNode: TipoNode,
    refId: string,
  ): Promise<Record<string, string | null> | null> {
    void userId;
    const target = await this.readNodeWithPath(refId);
    if (!target) return null;
    const n = target.node;
    switch (tipoNode) {
      case "ASSUNTO":
      case "TOPICO":
      case "CONCEITO":
        return { nome: n.nome ?? "", descricao: n.descricao ?? null };
      case "FLASHCARD":
        return { pergunta: n.pergunta ?? "", resposta: n.resposta ?? "" };
      case "NOTA":
        return {
          titulo: n.titulo ?? "",
          conteudo: n.conteudo ?? "",
          tipoNota: n.tipoNota ?? null,
          subtipo: n.subtipo ?? null,
          fonte: n.fonte ?? null,
        };
      case "TEXTO_BRUTO":
        return { titulo: n.titulo ?? "", texto: n.texto ?? "" };
      case "BARALHO":
        return { titulo: n.titulo ?? "" };
      default:
        return null;
    }
  }

  async savePositions(
    userId: string,
    grafoId: string,
    positions: Record<string, { x: number; y: number }>,
  ): Promise<void> {
    void userId;
    for (const [key, pos] of Object.entries(positions)) {
      const id = key.includes(":") ? key.split(":").slice(1).join(":") : key;
      const target = await this.readNodeWithPath(id);
      if (!target || target.node.grafoId !== grafoId) continue;
      target.node.posicaoX = pos.x;
      target.node.posicaoY = pos.y;
      await fs.writeFile(target.full, serializeNode(target.node), "utf8");
    }
  }

  async getPositions(userId: string, grafoId: string): Promise<Record<string, { x: number; y: number }>> {
    void userId;
    const out: Record<string, { x: number; y: number }> = {};
    for (const n of await this.readAllNodes()) {
      if (n.grafoId !== grafoId) continue;
      if (n.posicaoX != null || n.posicaoY != null) {
        out[n.id] = { x: n.posicaoX ?? 0, y: n.posicaoY ?? 0 };
      }
    }
    return out;
  }
}
