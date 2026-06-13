import { prisma } from "@/lib/prisma";
import { buildKnowledgeGraph, type GraphNode, type GraphEdge, type TipoRelacao } from "@/lib/graph";
import { buildNotaSlug } from "@/lib/nota-slug";
import { getAllowedRelations, isRelationAllowed } from "@/modules/graph/domain/services/relation-rules";
import type { CreateEdgeInput, CreateNodeInput, EdgeView, GraphStore, UpdateNodeInput } from "./graph-store";
import type { TipoNode } from "./vault-format";

async function resolveNodeLabel(node: { tipoNode: string; referenciaId: string }): Promise<string> {
  const { tipoNode, referenciaId } = node;
  switch (tipoNode) {
    case "ASSUNTO":
      return (await prisma.assunto.findUnique({ where: { id: referenciaId } }))?.nome ?? referenciaId;
    case "TOPICO":
      return (await prisma.topico.findUnique({ where: { id: referenciaId } }))?.nome ?? referenciaId;
    case "CONCEITO":
      return (await prisma.conceito.findUnique({ where: { id: referenciaId } }))?.nome ?? referenciaId;
    case "FLASHCARD":
      return (await prisma.flashcard.findUnique({ where: { id: referenciaId } }))?.pergunta?.slice(0, 50) ?? referenciaId;
    case "NOTA": {
      const nota = await prisma.nota.findUnique({ where: { id: referenciaId } });
      if (nota?.titulo && nota.titulo !== "Sem título") return nota.titulo;
      return nota?.conteudo?.slice(0, 50) ?? referenciaId;
    }
    case "TEXTO_BRUTO": {
      const tb = await prisma.textoBruto.findUnique({ where: { id: referenciaId } });
      if (tb?.titulo && tb.titulo !== "Texto sem título") return tb.titulo;
      return tb?.texto?.slice(0, 50) ?? referenciaId;
    }
    case "BARALHO":
      return (await prisma.baralho.findUnique({ where: { id: referenciaId } }))?.titulo ?? referenciaId;
    default:
      return referenciaId;
  }
}

// Backend de banco de dados — comportamento atual do app.
export class PrismaGraphStore implements GraphStore {
  async loadGraph(
    userId: string,
    grafoId?: string,
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    return buildKnowledgeGraph(userId, grafoId);
  }

  async createNode(
    userId: string,
    grafoId: string,
    tipoNode: TipoNode,
    input: CreateNodeInput,
  ): Promise<{ nodeId: string }> {
    const now = new Date();
    let entityId: string;

    switch (tipoNode) {
      case "FLASHCARD": {
        const fc = await prisma.flashcard.create({
          data: { pergunta: input.pergunta ?? "", resposta: input.resposta ?? "", usuarioId: userId, dataCriacao: now },
        });
        entityId = fc.id;
        break;
      }
      case "NOTA": {
        const titulo = (input.titulo ?? "").trim();
        const nota = await prisma.nota.create({
          data: {
            titulo,
            tipoNota: input.tipoNota ?? "PERMANENTE",
            subtipo: input.subtipo ?? "",
            fonte: input.fonte?.trim() || null,
            slug: buildNotaSlug(titulo, now),
            conteudo: input.conteudo ?? "",
            usuarioId: userId,
            dataCriacao: now,
          },
        });
        entityId = nota.id;
        break;
      }
      case "TEXTO_BRUTO": {
        const tb = await prisma.textoBruto.create({
          data: { titulo: input.titulo?.trim() || "Texto sem título", texto: input.texto ?? "", usuarioId: userId, dataCriacao: now },
        });
        entityId = tb.id;
        break;
      }
      case "ASSUNTO": {
        const a = await prisma.assunto.create({
          data: { nome: input.nome ?? "", descricao: input.descricao ?? null, usuarioId: userId },
        });
        entityId = a.id;
        break;
      }
      case "TOPICO": {
        const t = await prisma.topico.create({
          data: { nome: input.nome ?? "", descricao: input.descricao ?? null, assuntoId: input.assuntoId ?? null, usuarioId: userId },
        });
        entityId = t.id;
        break;
      }
      case "CONCEITO": {
        const c = await prisma.conceito.create({
          data: { nome: input.nome ?? "", descricao: input.descricao ?? null, topicoId: input.topicoId ?? null, usuarioId: userId },
        });
        entityId = c.id;
        break;
      }
      case "BARALHO": {
        const b = await prisma.baralho.create({
          data: { titulo: (input.titulo ?? input.nome ?? "").trim(), usuarioId: userId, dataCriacao: now },
        });
        entityId = b.id;
        break;
      }
      default:
        throw new Error(`Tipo de nó desconhecido: ${tipoNode}`);
    }

    await prisma.nodeConhecimento.create({
      data: {
        grafoId,
        tipoNode: tipoNode as never,
        referenciaId: entityId,
        usuarioId: userId,
        posicaoX: input.posicaoX ?? null,
        posicaoY: input.posicaoY ?? null,
        nivelDominio: input.nivelDominio ?? 0,
      },
    });

    return { nodeId: entityId };
  }

  async getEdges(userId: string, grafoId: string): Promise<EdgeView[]> {
    const edges = await prisma.conhecimentoAresta.findMany({
      where: { grafoId },
      include: { nodeOrigem: true, nodeDestino: true },
    });
    const userEdges = edges.filter(
      (e) => e.nodeOrigem?.usuarioId === userId && e.nodeDestino?.usuarioId === userId,
    );
    return Promise.all(
      userEdges.map(async (edge) => ({
        id: edge.id,
        source: edge.nodeOrigem!.referenciaId,
        target: edge.nodeDestino!.referenciaId,
        tipoRelacao: edge.tipoRelacao as TipoRelacao,
        peso: edge.peso,
        sourceLabel: await resolveNodeLabel(edge.nodeOrigem!),
        targetLabel: await resolveNodeLabel(edge.nodeDestino!),
      })),
    );
  }

  async createEdge(
    userId: string,
    grafoId: string,
    input: CreateEdgeInput,
  ): Promise<{ edgeId: string }> {
    if (
      input.peso !== undefined &&
      (typeof input.peso !== "number" || !Number.isFinite(input.peso) || input.peso <= 0 || input.peso > 2)
    ) {
      throw new Error("Peso da relação inválido (use um número entre 0 e 2)");
    }

    const [sourceNode, targetNode] = await Promise.all([
      prisma.nodeConhecimento.findFirst({ where: { referenciaId: input.sourceNodeId, usuarioId: userId, grafoId } }),
      prisma.nodeConhecimento.findFirst({ where: { referenciaId: input.targetNodeId, usuarioId: userId, grafoId } }),
    ]);
    if (!sourceNode || !targetNode) throw new Error("Um ou ambos os nós não encontrados no grafo");

    if (!isRelationAllowed(sourceNode.tipoNode, targetNode.tipoNode, input.tipoRelacao)) {
      const allowed = getAllowedRelations(sourceNode.tipoNode, targetNode.tipoNode);
      throw new Error(
        allowed.length === 0
          ? `Nós do tipo ${sourceNode.tipoNode} e ${targetNode.tipoNode} não podem ser relacionados`
          : `Relação ${input.tipoRelacao} não é permitida entre ${sourceNode.tipoNode} e ${targetNode.tipoNode}. Permitidas: ${allowed.join(", ")}`,
      );
    }

    const existing = await prisma.conhecimentoAresta.findFirst({
      where: { grafoId, nodeOrigemId: sourceNode.id, nodeDestinoId: targetNode.id, tipoRelacao: input.tipoRelacao as never },
    });
    if (existing) throw new Error("Relação já existe entre esses nós com este tipo");

    const edge = await prisma.conhecimentoAresta.create({
      data: {
        grafoId,
        nodeOrigemId: sourceNode.id,
        nodeDestinoId: targetNode.id,
        tipoRelacao: input.tipoRelacao as never,
        peso: input.peso ?? 1.0,
      },
    });
    return { edgeId: edge.id };
  }

  async updateEdge(
    userId: string,
    grafoId: string,
    edgeId: string,
    data: { tipoRelacao?: TipoRelacao; peso?: number },
  ): Promise<void> {
    const existing = await prisma.conhecimentoAresta.findFirst({
      where: { id: edgeId, grafoId },
      include: { nodeOrigem: true },
    });
    if (!existing || existing.nodeOrigem?.usuarioId !== userId) {
      throw new Error("Relação não encontrada ou não pertence ao usuário");
    }
    const updateData: { tipoRelacao?: never; peso?: number } = {};
    if (data.tipoRelacao) updateData.tipoRelacao = data.tipoRelacao as never;
    if (data.peso !== undefined) updateData.peso = data.peso;
    await prisma.conhecimentoAresta.update({ where: { id: edgeId }, data: updateData });
  }

  async deleteEdge(userId: string, grafoId: string, edgeId: string): Promise<void> {
    const edge = await prisma.conhecimentoAresta.findFirst({
      where: { id: edgeId, grafoId },
      include: { nodeOrigem: true },
    });
    if (!edge || edge.nodeOrigem?.usuarioId !== userId) {
      throw new Error("Relação não encontrada ou não pertence ao usuário");
    }
    await prisma.conhecimentoAresta.delete({ where: { id: edgeId } });
  }

  async deleteNode(userId: string, refId: string, grafoId?: string): Promise<{ deletedType: string }> {
    const node = await prisma.nodeConhecimento.findFirst({
      where: { referenciaId: refId, usuarioId: userId, ...(grafoId ? { grafoId } : {}) },
    });
    if (!node) throw new Error("Node não encontrado no grafo");
    const nodeTipo = node.tipoNode;

    await prisma.$transaction(async (tx) => {
      await tx.conhecimentoAresta.deleteMany({
        where: { OR: [{ nodeOrigemId: node.id }, { nodeDestinoId: node.id }] },
      });
      await tx.desempenhoNo.deleteMany({ where: { nodeId: node.id } });
      switch (nodeTipo) {
        case "FLASHCARD":
          await tx.revisaoFlashcard.deleteMany({ where: { flashcardId: refId } });
          await tx.aprendizadoFlashcard.deleteMany({ where: { flashcardId: refId } });
          await tx.flashcard.delete({ where: { id: refId } });
          break;
        case "NOTA":
          await tx.nota.delete({ where: { id: refId } });
          break;
        case "ASSUNTO":
          await tx.topico.updateMany({ where: { assuntoId: refId }, data: { assuntoId: null } });
          await tx.assunto.delete({ where: { id: refId } });
          break;
        case "TOPICO":
          await tx.conceito.updateMany({ where: { topicoId: refId }, data: { topicoId: null } });
          await tx.topico.delete({ where: { id: refId } });
          break;
        case "CONCEITO":
          await tx.conceito.delete({ where: { id: refId } });
          break;
      }
      await tx.nodeConhecimento.delete({ where: { id: node.id } });
    });

    return { deletedType: nodeTipo };
  }

  async updateNode(
    userId: string,
    tipoNode: TipoNode,
    refId: string,
    data: UpdateNodeInput,
  ): Promise<void> {
    const where = { id: refId, usuarioId: userId };
    let count = 0;
    switch (tipoNode) {
      case "ASSUNTO":
        count = (await prisma.assunto.updateMany({ where, data: { nome: data.nome, descricao: data.descricao } })).count;
        break;
      case "TOPICO":
        count = (await prisma.topico.updateMany({ where, data: { nome: data.nome, descricao: data.descricao } })).count;
        break;
      case "CONCEITO":
        count = (await prisma.conceito.updateMany({ where, data: { nome: data.nome, descricao: data.descricao } })).count;
        break;
      case "FLASHCARD":
        count = (await prisma.flashcard.updateMany({ where, data: { pergunta: data.pergunta, resposta: data.resposta } })).count;
        break;
      case "NOTA":
        count = (await prisma.nota.updateMany({
          where,
          data: {
            titulo: data.titulo?.trim(),
            conteudo: data.conteudo,
            tipoNota: data.tipoNota,
            subtipo: data.subtipo,
            fonte: data.fonte === undefined ? undefined : data.fonte?.trim() || null,
          },
        })).count;
        break;
      case "TEXTO_BRUTO":
        count = (await prisma.textoBruto.updateMany({
          where,
          data: { titulo: data.titulo?.trim(), texto: data.texto?.trim() },
        })).count;
        break;
      default:
        throw new Error(`Tipo de nó desconhecido: ${tipoNode}`);
    }
    if (count === 0) throw new Error("Nó não encontrado ou não pertence ao usuário");
  }

  async getNodeDetails(
    userId: string,
    tipoNode: TipoNode,
    refId: string,
  ): Promise<Record<string, string | null> | null> {
    switch (tipoNode) {
      case "ASSUNTO": {
        const a = await prisma.assunto.findFirst({ where: { id: refId, usuarioId: userId } });
        return a ? { nome: a.nome, descricao: a.descricao } : null;
      }
      case "TOPICO": {
        const t = await prisma.topico.findFirst({ where: { id: refId, usuarioId: userId } });
        return t ? { nome: t.nome, descricao: t.descricao } : null;
      }
      case "CONCEITO": {
        const c = await prisma.conceito.findFirst({ where: { id: refId, usuarioId: userId } });
        return c ? { nome: c.nome, descricao: c.descricao } : null;
      }
      case "FLASHCARD": {
        const f = await prisma.flashcard.findFirst({ where: { id: refId, usuarioId: userId } });
        return f ? { pergunta: f.pergunta, resposta: f.resposta } : null;
      }
      case "NOTA": {
        const n = await prisma.nota.findFirst({ where: { id: refId, usuarioId: userId } });
        return n
          ? {
              titulo: n.titulo,
              conteudo: n.conteudo,
              tipoNota: n.tipoNota,
              subtipo: n.subtipo,
              fonte: n.fonte,
              slug: n.slug,
              dataCriacao: n.dataCriacao.toISOString(),
              dataAtualizacao: n.dataAtualizacao.toISOString(),
            }
          : null;
      }
      case "TEXTO_BRUTO": {
        const t = await prisma.textoBruto.findFirst({ where: { id: refId, usuarioId: userId } });
        return t ? { titulo: t.titulo, texto: t.texto, dataCriacao: t.dataCriacao.toISOString() } : null;
      }
      case "BARALHO": {
        const b = await prisma.baralho.findFirst({
          where: { id: refId, usuarioId: userId },
          include: { _count: { select: { flashcards: true } } },
        });
        return b ? { titulo: b.titulo, flashcards: String(b._count.flashcards), dataCriacao: b.dataCriacao.toISOString() } : null;
      }
      default:
        return null;
    }
  }

  async savePositions(
    userId: string,
    grafoId: string,
    positions: Record<string, { x: number; y: number }>,
  ): Promise<void> {
    if (!grafoId || Object.keys(positions).length === 0) return;
    const typeMap: Record<string, string> = {
      flashcard: "FLASHCARD", nota: "NOTA", assunto: "ASSUNTO", topico: "TOPICO", conceito: "CONCEITO",
    };
    await prisma.$transaction(async (tx) => {
      for (const [refId, pos] of Object.entries(positions)) {
        const nodeId = refId.includes(":") ? refId.split(":").slice(1).join(":") : refId;
        const typePrefix = refId.includes(":") ? refId.split(":")[0].toLowerCase() : null;
        if (!typePrefix) continue;
        const tipoNode = typeMap[typePrefix];
        if (!tipoNode) continue;
        const existing = await tx.nodeConhecimento.findFirst({
          where: { grafoId, usuarioId: userId, tipoNode: tipoNode as never, referenciaId: nodeId },
          select: { id: true },
        });
        if (existing) {
          await tx.nodeConhecimento.update({ where: { id: existing.id }, data: { posicaoX: pos.x, posicaoY: pos.y } });
        } else {
          await tx.nodeConhecimento.create({
            data: { usuarioId: userId, grafoId, tipoNode: tipoNode as never, referenciaId: nodeId, posicaoX: pos.x, posicaoY: pos.y },
          });
        }
      }
    });
  }

  async getPositions(userId: string, grafoId: string): Promise<Record<string, { x: number; y: number }>> {
    void userId;
    const rows = await prisma.nodeConhecimento.findMany({
      where: { grafoId },
      select: { referenciaId: true, posicaoX: true, posicaoY: true },
    });
    const out: Record<string, { x: number; y: number }> = {};
    for (const r of rows) out[r.referenciaId] = { x: r.posicaoX ?? 0, y: r.posicaoY ?? 0 };
    return out;
  }
}
