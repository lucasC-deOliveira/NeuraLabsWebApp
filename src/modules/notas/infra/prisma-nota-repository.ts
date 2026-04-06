import { prisma } from "@/lib/prisma";
import { Nota } from "../domain/entities/nota";
import { NotaRepository } from "../domain/repositories/nota-repository";

export class PrismaNotaRepository implements NotaRepository {
  async save(nota: Nota): Promise<number> {
    await prisma.$transaction(async (tx) => {
      // 1. Upsert nota record
      await tx.nota.upsert({
        where: { id: nota.id },
        create: {
          id: nota.id,
          usuarioId: nota.userId,
          textoBruto: nota.preview,
        },
        update: {
          textoBruto: nota.preview,
        },
      });

      // 2. Create NOTA node
      const existingNotaNode = await tx.nodeConhecimento.findFirst({
        where: { tipoNode: "NOTA", referenciaId: nota.id },
      });
      if (!existingNotaNode) {
        await tx.nodeConhecimento.create({
          data: { tipoNode: "NOTA", referenciaId: nota.id, usuarioId: nota.userId },
        });
      }

      // 3. For each matched concept, build full hierarchy in graph
      if (nota.conceitoIds.length === 0) return;

      // Load concepts with their topic and assunto
      const conceitos = await tx.conceito.findMany({
        where: { id: { in: [...nota.conceitoIds] } },
        include: { topico: { include: { assunto: true } } },
      });

      const assuntoSet = new Set<string>();
      const topicoSet = new Set<string>();

      for (const c of conceitos) {
        assuntoSet.add(c.topico.assuntoId);
        topicoSet.add(c.topicoId);
      }

      // 3a. ASSUNTO nodes
      const assuntoNodeIds = new Map<string, string>();
      for (const assuntoId of assuntoSet) {
        const existing = await tx.nodeConhecimento.findFirst({
          where: { tipoNode: "ASSUNTO", referenciaId: `assunto-${assuntoId}` },
        });
        if (!existing) {
          const created = await tx.nodeConhecimento.create({
            data: { tipoNode: "ASSUNTO", referenciaId: `assunto-${assuntoId}`, usuarioId: nota.userId },
          });
          assuntoNodeIds.set(assuntoId, created.id);
        } else {
          assuntoNodeIds.set(assuntoId, existing.id);
        }
      }

      // 3b. TOPICO nodes + edges ASSUNTO → TOPICO (GERA)
      const topicoNodeIds = new Map<string, string>();
      for (const topicoId of topicoSet) {
        const existing = await tx.nodeConhecimento.findFirst({
          where: { tipoNode: "TOPICO", referenciaId: `topico-${topicoId}` },
        });
        if (!existing) {
          const created = await tx.nodeConhecimento.create({
            data: { tipoNode: "TOPICO", referenciaId: `topico-${topicoId}`, usuarioId: nota.userId },
          });
          topicoNodeIds.set(topicoId, created.id);
        } else {
          topicoNodeIds.set(topicoId, existing.id);
        }

        const topicoData = conceitos.find((c) => c.topicoId === topicoId);
        if (topicoData) {
          const aNodeId = assuntoNodeIds.get(topicoData.topico.assuntoId);
          if (aNodeId) {
            const tNodeId = topicoNodeIds.get(topicoId)!;
            const exists = await tx.conhecimentoAresta.findFirst({
              where: { nodeOrigemId: aNodeId, nodeDestinoId: tNodeId, tipoRelacao: "GERA" },
            });
            if (!exists) {
              await tx.conhecimentoAresta.create({
                data: { nodeOrigemId: aNodeId, nodeDestinoId: tNodeId, tipoRelacao: "GERA", peso: 0.9 },
              });
            }
          }
        }
      }

      // 3c. CONCEITO nodes + edges TOPICO → CONCEITO (DEFINE) + NOTA → CONCEITO (REFERENCIA)
      const notaNodeId = (await tx.nodeConhecimento.findFirst({
        where: { tipoNode: "NOTA", referenciaId: nota.id },
      }))!.id;

      for (const c of conceitos) {
        const refId = `conceito-${c.id}`;
        const existingConceptNode = await tx.nodeConhecimento.findFirst({
          where: { tipoNode: "CONCEITO", referenciaId: refId, usuarioId: nota.userId },
        });
        let cNodeId: string;
        if (!existingConceptNode) {
          const created = await tx.nodeConhecimento.create({
            data: { tipoNode: "CONCEITO", referenciaId: refId, usuarioId: nota.userId },
          });
          cNodeId = created.id;
        } else {
          cNodeId = existingConceptNode.id;
        }

        // TOPICO → CONCEITO (DEFINE)
        const tNodeId = topicoNodeIds.get(c.topicoId);
        if (tNodeId) {
          const exists = await tx.conhecimentoAresta.findFirst({
            where: { nodeOrigemId: tNodeId, nodeDestinoId: cNodeId, tipoRelacao: "DEFINE" },
          });
          if (!exists) {
            await tx.conhecimentoAresta.create({
              data: { nodeOrigemId: tNodeId, nodeDestinoId: cNodeId, tipoRelacao: "DEFINE", peso: 0.9 },
            });
          }
        }

        // NOTA → CONCEITO (REFERENCIA)
        const existsRef = await tx.conhecimentoAresta.findFirst({
          where: { nodeOrigemId: notaNodeId, nodeDestinoId: cNodeId, tipoRelacao: "REFERENCIA" },
        });
        if (!existsRef) {
          await tx.conhecimentoAresta.create({
            data: { nodeOrigemId: notaNodeId, nodeDestinoId: cNodeId, tipoRelacao: "REFERENCIA", peso: 0.8 },
          });
        }
      }
    });

    return this.countNodes(nota);
  }

  /** Estimate created nodes: 1 (nota) + n concepts */
  private async countNodes(nota: Nota): Promise<number> {
    const n = (await prisma.nodeConhecimento.findFirst({
      where: { tipoNode: "NOTA", referenciaId: nota.id },
    }))
      ? 1
      : 0;
    const c = nota.conceitoIds.length;
    return n + c;
  }

  async findById(id: string): Promise<Nota | null> {
    const raw = await prisma.nota.findUnique({
      where: { id },
      include: {
        arestasOrigem: {
          include: { nodeDestino: true },
        },
      },
    });

    if (!raw) return null;

    const conceitoIds: string[] = [];
    const flashcardIds: string[] = [];

    for (const edge of raw.arestasOrigem) {
      if (edge.nodeDestino?.tipoNode === "CONCEITO") {
        conceitoIds.push(edge.nodeDestino.referenciaId);
      }
    }

    return Nota.restore({
      id: raw.id,
      userId: raw.usuarioId,
      titulo: null, // Title is embedded in textoBruto
      textoBruto: raw.textoBruto,
      sections: [],
      conceitoIds,
      flashcardIds,
      createdAt: raw.dataCriacao,
    });
  }

  async findByUserId(userId: string): Promise<Nota[]> {
    const rawNotas = await prisma.nota.findMany({
      where: { usuarioId: userId },
      orderBy: { dataCriacao: "desc" },
    });

    return rawNotas.map((raw) =>
      Nota.restore({
        id: raw.id,
        userId: raw.usuarioId,
        titulo: null,
        textoBruto: raw.textoBruto,
        sections: [],
        conceitoIds: [],
        flashcardIds: [],
        createdAt: raw.dataCriacao,
      }),
    );
  }

  async delete(id: string): Promise<void> {
    await prisma.nota.delete({ where: { id } });
  }
}
