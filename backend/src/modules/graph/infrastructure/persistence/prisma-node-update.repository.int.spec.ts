import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaNodeUpdateRepository } from './prisma-node-update.repository';
import { UpdateNodeUseCase } from '../../application/use-cases/update-node.use-case';
import { NodeNotInGraphError } from '../../domain/errors';

// Integration of the node-update adapter against the real DB (neuralabs_test),
// driven by the UpdateNode use-case. Validates the typed update and ownership.

const TABLES = ['"conceitos"', '"usuarios"'];

describe('Node update (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let updateNode: UpdateNodeUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    updateNode = new UpdateNodeUseCase(new PrismaNodeUpdateRepository(prisma));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let seq = 0;
  async function seedConcept(nome: string): Promise<{ userId: string; conceitoId: string }> {
    const user = await prisma.usuario.create({
      data: { nome: 'Teste', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    const conceito = await prisma.conceito.create({ data: { usuarioId: user.id, nome } });
    return { userId: user.id, conceitoId: conceito.id };
  }

  it('updates an owned concept', async () => {
    const { userId, conceitoId } = await seedConcept('Old');
    await updateNode.execute(userId, 'CONCEITO', conceitoId, { nome: 'New' });
    expect(await prisma.conceito.findUnique({ where: { id: conceitoId } })).toMatchObject({
      nome: 'New',
    });
  });

  it('throws when the node does not belong to the user', async () => {
    const { conceitoId } = await seedConcept('Old');
    const intruder = await seedConcept('Other');
    await expect(
      updateNode.execute(intruder.userId, 'CONCEITO', conceitoId, { nome: 'Hacked' }),
    ).rejects.toBeInstanceOf(NodeNotInGraphError);
    expect(await prisma.conceito.findUnique({ where: { id: conceitoId } })).toMatchObject({
      nome: 'Old',
    });
  });
});
