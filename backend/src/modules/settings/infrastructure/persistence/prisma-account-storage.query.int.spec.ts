import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaAccountStorageQuery } from './prisma-account-storage.query';

describe('PrismaAccountStorageQuery', () => {
  const prisma = new PrismaService();
  const meter = new PrismaAccountStorageQuery(prisma);
  const accounts: string[] = [];

  beforeAll(async () => prisma.$connect());
  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { id: { in: accounts } } });
    await prisma.$disconnect();
  });

  async function createAccount(): Promise<string> {
    const account = await prisma.usuario.create({
      data: {
        nome: 'Storage QA',
        email: `storage-${randomUUID()}@test.example`,
        senhaHash: 'test',
      },
    });
    accounts.push(account.id);
    return account.id;
  }

  async function addQuestion(userId: string): Promise<string> {
    const question = await prisma.questao.create({
      data: { usuarioId: userId, tipo: 'VERDADEIRO_FALSO', enunciado: 'Question', gabarito: 'V' },
    });
    return question.id;
  }

  it('counts raw image bytes for their owner without changing another account totals', async () => {
    const owner = await createAccount();
    const other = await createAccount();
    const questionId = await addQuestion(owner);
    const before = await meter.measure(owner);
    const otherBefore = await meter.measure(other);
    await prisma.questaoImagem.create({
      data: { questaoId: questionId, mimetype: 'image/png', dados: Buffer.alloc(4096) },
    });
    const after = await meter.measure(owner);
    expect(after.totalBytes - before.totalBytes).toBeGreaterThan(4096);
    expect(after.totalBytes - before.totalBytes).toBeLessThan(4500);
    expect(after.totalBytes).toBe(
      after.categories.reduce((total, category) => total + category.bytes, 0),
    );
    await expect(meter.measure(other)).resolves.toEqual(otherBefore);
  });
});
