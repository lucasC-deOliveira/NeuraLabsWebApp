import { prisma } from "@/lib/prisma";
import { buildKnowledgeGraph, type GraphNode, type GraphEdge } from "@/lib/graph";
import { buildNotaSlug } from "@/lib/nota-slug";
import type { CreateNodeInput, GraphStore } from "./graph-store";
import type { TipoNode } from "./vault-format";

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
}
