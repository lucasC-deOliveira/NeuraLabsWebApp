import { prisma } from "@/lib/prisma";
import { buildKnowledgeGraph, type GraphNode, type GraphEdge, type TipoRelacao } from "@/lib/graph";
import { buildNotaSlug } from "@/lib/nota-slug";
import { getAllowedRelations, isRelationAllowed } from "@/modules/graph/domain/services/relation-rules";
import type { CreateEdgeInput, CreateNodeInput, EdgeView, GraphStore } from "./graph-store";
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
}
