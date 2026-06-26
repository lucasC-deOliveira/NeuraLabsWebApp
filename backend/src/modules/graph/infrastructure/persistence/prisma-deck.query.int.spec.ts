import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaDeckQuery } from './prisma-deck.query';

// Integration of the deck read model against the real DB (neuralabs_test).
// Validates the concept name resolution and the ownership filter.

const TABLES = ['"baralhos"', '"flashcards"', '"conceitos"', '"usuarios"'];

describe('Deck query (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let query: PrismaDeckQuery;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    query = new PrismaDeckQuery(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let seq = 0;
  async function seedUser(): Promise<string> {
    const user = await prisma.usuario.create({
      data: { nome: 'Teste', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    return user.id;
  }

  it('lists user flashcards with their concept name', async () => {
    const userId = await seedUser();
    const conceito = await prisma.conceito.create({ data: { usuarioId: userId, nome: 'Mitose' } });
    await prisma.flashcard.create({
      data: { usuarioId: userId, pergunta: 'Q', resposta: 'A', conceitoId: conceito.id },
    });

    const list = await query.listUserFlashcards(userId);
    expect(list).toEqual([{ id: expect.any(String), pergunta: 'Q', conceito: 'Mitose' }]);
  });

  it('returns a deck with its cards for study', async () => {
    const userId = await seedUser();
    const baralho = await prisma.baralho.create({
      data: {
        usuarioId: userId,
        titulo: 'Bio',
        flashcards: { create: [{ usuarioId: userId, pergunta: 'Q', resposta: 'A' }] },
      },
    });

    const deck = await query.findDeckForStudy(userId, baralho.id);
    expect(deck?.titulo).toBe('Bio');
    expect(deck?.cards).toEqual([
      { id: expect.any(String), pergunta: 'Q', resposta: 'A', conceito: null },
    ]);
  });

  it('returns null for a deck owned by another user', async () => {
    const owner = await seedUser();
    const other = await seedUser();
    const baralho = await prisma.baralho.create({ data: { usuarioId: owner, titulo: 'Mine' } });

    expect(await query.findDeckForStudy(other, baralho.id)).toBeNull();
  });
});
