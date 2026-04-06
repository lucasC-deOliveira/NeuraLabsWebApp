import { prisma } from "@/lib/prisma";
import { Nota } from "../domain/entities/nota";
import { NotaRepository } from "../domain/repositories/nota-repository";
import { NotaSection } from "../domain/entities/nota-section";
import { NotaDefinition } from "../domain/value-objects/nota-definition";
import { TipoRelacao } from "@/lib/graph";

export class PrismaNotaRepository implements NotaRepository {
  async save(nota: Nota): Promise<void> {
    await prisma.nota.upsert({
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
