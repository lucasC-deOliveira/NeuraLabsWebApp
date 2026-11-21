import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaConnectedConceptsQuery } from '../../../curriculum/infrastructure/persistence/prisma-connected-concepts.query';
import { PrismaBaralhoQuery } from './prisma-baralho.query';

describe('Deck detail review state', () => {
  it('includes future review state and marks new cards with an explicit null', async () => {
    const prisma = new PrismaService();
    await prisma.$connect();
    const owner = await prisma.usuario.create({
      data: { nome: 'Deck snapshot', email: `${crypto.randomUUID()}@test.com`, senhaHash: 'test' },
    });
    try {
      const deck = await prisma.baralho.create({
        data: { usuarioId: owner.id, titulo: 'Biology' },
      });
      const makeCard = (pergunta: string) =>
        prisma.flashcard.create({
          data: {
            usuarioId: owner.id,
            pergunta,
            resposta: 'Answer',
            baralhos: { connect: { id: deck.id } },
          },
        });
      const reviewed = await makeCard('Reviewed card');
      const fresh = await makeCard('New card');
      const reviewAt = new Date('2099-01-02T00:00:00Z');
      await prisma.aprendizadoFlashcard.create({
        data: {
          usuarioId: owner.id,
          flashcardId: reviewed.id,
          fase: 'REVIEW',
          proximaRevisao: reviewAt,
        },
      });

      const query = new PrismaBaralhoQuery(prisma, new PrismaConnectedConceptsQuery(prisma));
      const snapshot = await query.getBaralho(owner.id, deck.id);

      expect(snapshot?.cards).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: reviewed.id,
            schedule: expect.objectContaining({ fase: 'REVIEW', proximaRevisao: reviewAt }),
          }),
          expect.objectContaining({ id: fresh.id, schedule: null }),
        ]),
      );
    } finally {
      try {
        await prisma.usuario.delete({ where: { id: owner.id } });
      } finally {
        await prisma.$disconnect();
      }
    }
  });
});
