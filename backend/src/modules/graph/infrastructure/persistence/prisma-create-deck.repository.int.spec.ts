import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaCreateDeckRepository } from './prisma-create-deck.repository';
import { CreateDeckUseCase } from '../../application/use-cases/create-deck.use-case';
import { FlashcardsNotOwnedError } from '../../domain/errors';

// Integration of the deck-creation adapter against the real DB (neuralabs_test),
// driven by the CreateDeck use-case. Validates the deck node and CONTEM edges.

const TABLES = [
  '"ConhecimentoAresta"',
  '"NodeConhecimento"',
  '"baralhos"',
  '"flashcards"',
  '"grafos_conhecimento"',
  '"usuarios"',
];

describe('Deck creation (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let createDeck: CreateDeckUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    createDeck = new CreateDeckUseCase(new PrismaCreateDeckRepository(prisma));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let seq = 0;
  async function seedGraphWithFlashcard(): Promise<{
    userId: string;
    grafoId: string;
    flashcardId: string;
  }> {
    const user = await prisma.usuario.create({
      data: { nome: 'Teste', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    const grafo = await prisma.grafosConhecimento.create({
      data: { usuarioId: user.id, nome: 'G' },
    });
    const fc = await prisma.flashcard.create({
      data: { usuarioId: user.id, pergunta: 'Q', resposta: 'A' },
    });
    return { userId: user.id, grafoId: grafo.id, flashcardId: fc.id };
  }

  it('creates the deck node and a CONTEM edge to the flashcard', async () => {
    const { userId, grafoId, flashcardId } = await seedGraphWithFlashcard();
    const { nodeId } = await createDeck.execute(userId, grafoId, 'Bio', [flashcardId]);

    expect(await prisma.baralho.findUnique({ where: { id: nodeId } })).toMatchObject({
      titulo: 'Bio',
    });
    expect(
      await prisma.conhecimentoAresta.count({ where: { grafoId, tipoRelacao: 'CONTEM' } }),
    ).toBe(1);
  });

  it('rejects flashcards owned by another user', async () => {
    const owner = await seedGraphWithFlashcard();
    const other = await seedGraphWithFlashcard();
    await expect(
      createDeck.execute(owner.userId, owner.grafoId, 'Bio', [other.flashcardId]),
    ).rejects.toBeInstanceOf(FlashcardsNotOwnedError);
  });
});
