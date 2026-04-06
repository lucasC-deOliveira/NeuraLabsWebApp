import { prisma } from "@/lib/prisma";
import { Nota } from "../domain/entities/nota";
import { FlashcardGenerator } from "../application/use-cases/generate-flashcards-from-nota.use-case";

export class PrismaFlashcardGenerator implements FlashcardGenerator {
  async generateFromNota(nota: Nota): Promise<string[]> {
    const flashcardIds: string[] = [];

    for (const section of nota.sections) {
      // 1. From definitions
      for (const def of section.definitions) {
        const targetConceptId = nota.conceitoIds[0] ?? null;
        if (!targetConceptId) continue;

        const fc = await prisma.flashcard.create({
          data: {
            pergunta: `O que é/define "${def.term}"?`,
            resposta: def.explanation,
            conceitoId: targetConceptId,
            usuarioId: nota.userId,
          },
        });

        const nextReview = new Date();
        await prisma.aprendizadoFlashcard.create({
          data: {
            flashcardId: fc.id,
            usuarioId: nota.userId,
            dificuldade: 5,
            intervalo: 0,
            proximaRevisao: nextReview,
            ultimaRevisao: nextReview,
            estagioAprendizado: 1,
          },
        });

        // Create knowledge nodes and edges
        const fcNodeId = await this.ensureKnowledgeNodes(
          fc.id,
          targetConceptId,
          nota.id,
        );

        flashcardIds.push(fc.id);
      }

      // 2. Fallback: from content if no definitions produced cards
      if (flashcardIds.length === 0 && section.content.length > 0) {
        const targetConceptId = nota.conceitoIds[0];
        if (!targetConceptId) continue;

        const content = section.content.join("\n");
        const fc = await prisma.flashcard.create({
          data: {
            pergunta: `Explique: ${section.heading}`,
            resposta: content.slice(0, 500),
            conceitoId: targetConceptId,
            usuarioId: nota.userId,
          },
        });

        const nextReview = new Date();
        await prisma.aprendizadoFlashcard.create({
          data: {
            flashcardId: fc.id,
            usuarioId: nota.userId,
            dificuldade: 5,
            intervalo: 0,
            proximaRevisao: nextReview,
            ultimaRevisao: nextReview,
            estagioAprendizado: 1,
          },
        });

        await this.ensureKnowledgeNodes(fc.id, targetConceptId, nota.id);
        flashcardIds.push(fc.id);
      }
    }

    return flashcardIds;
  }

  private async ensureKnowledgeNodes(
    flashcardId: string,
    conceitoId: string,
    notaId: string,
  ): Promise<string> {
    // Check or create concept node
    let conceptNode = await prisma.nodeConhecimento.findFirst({
      where: { tipoNode: "CONCEITO", referenciaId: conceitoId },
    });
    if (!conceptNode) {
      conceptNode = await prisma.nodeConhecimento.create({
        data: { tipoNode: "CONCEITO", referenciaId: conceitoId },
      });
    }

    // Create flashcard node
    await prisma.nodeConhecimento.create({
      data: { tipoNode: "FLASHCARD", referenciaId: flashcardId },
    });

    // Create nota node if not exists
    const notaNode = await prisma.nodeConhecimento.findFirst({
      where: { tipoNode: "NOTA", referenciaId: notaId },
    });
    if (!notaNode) {
      await prisma.nodeConhecimento.create({
        data: { tipoNode: "NOTA", referenciaId: notaId },
      });
    }

    // TESTA_DEFINICAO: FC → Concept
    const fcNode = await prisma.nodeConhecimento.findFirst({
      where: { tipoNode: "FLASHCARD", referenciaId: flashcardId },
    });

    if (fcNode) {
      await prisma.conhecimentoAresta.create({
        data: {
          nodeOrigemId: fcNode.id,
          nodeDestinoId: conceptNode.id,
          tipoRelacao: "TESTA_DEFINICAO",
          peso: 1.0,
        },
      });

      // GERA: Nota → FC
      await prisma.conhecimentoAresta.create({
        data: {
          notaOrigemId: notaId,
          nodeDestinoId: fcNode.id,
          tipoRelacao: "GERA",
          peso: 1.0,
        },
      });

      // REFERENCIA: FC → Nota
      await prisma.conhecimentoAresta.create({
        data: {
          nodeOrigemId: fcNode.id,
          notaOrigemId: notaId,
          tipoRelacao: "REFERENCIA",
          peso: 0.8,
        },
      });
    }

    return fcNode?.id ?? "";
  }
}
