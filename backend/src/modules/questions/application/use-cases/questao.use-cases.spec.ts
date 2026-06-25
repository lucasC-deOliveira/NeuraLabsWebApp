import { describe, it, expect } from 'vitest';
import { CreateQuestaoUseCase } from './create-questao.use-case';
import { ListQuestoesUseCase } from './list-questoes.use-case';
import { GetQuestaoUseCase } from './get-questao.use-case';
import { UpdateQuestaoUseCase } from './update-questao.use-case';
import { RemoveQuestaoUseCase } from './remove-questao.use-case';
import { QuestaoForbiddenError, QuestaoNotFoundError } from '../../domain/errors';
import type { QuestaoRepository, UpdateQuestaoPatch } from '../../domain/ports/questao-repository';
import type { CreateQuestaoInput, OwnedQuestao, QuestaoView } from '../../domain/questao';

const owned = (usuarioId: string): OwnedQuestao => ({
  id: 'q1',
  usuarioId,
  tipo: 'MULTIPLA_ESCOLHA',
  enunciado: 'E',
  gabarito: 'A',
  explicacao: null,
  alternativas: null,
  conceitoId: null,
  conceitoNome: null,
  dataCriacao: new Date(0),
});

class FakeRepo implements QuestaoRepository {
  updated: Array<{ id: string; patch: UpdateQuestaoPatch }> = [];
  deleted: string[] = [];
  constructor(private readonly stored: OwnedQuestao | null = null) {}
  async create(): Promise<string> {
    return 'new-id';
  }
  async listByUser(): Promise<QuestaoView[]> {
    return this.stored ? [this.stored] : [];
  }
  async findById(): Promise<OwnedQuestao | null> {
    return this.stored;
  }
  async update(id: string, patch: UpdateQuestaoPatch): Promise<void> {
    this.updated.push({ id, patch });
  }
  async delete(id: string): Promise<void> {
    this.deleted.push(id);
  }
}

const input: CreateQuestaoInput = { tipo: 'VERDADEIRO_FALSO', enunciado: 'E', gabarito: 'V' };

describe('questions use-cases', () => {
  it('creates and returns the id', async () => {
    expect(await new CreateQuestaoUseCase(new FakeRepo()).execute('u1', input)).toEqual({
      questaoId: 'new-id',
    });
  });

  it('lists the user questions', async () => {
    const res = await new ListQuestoesUseCase(new FakeRepo(owned('u1'))).execute('u1');
    expect(res).toHaveLength(1);
  });

  it('gets an owned question', async () => {
    const res = await new GetQuestaoUseCase(new FakeRepo(owned('u1'))).execute('u1', 'q1');
    expect(res.id).toBe('q1');
  });

  it('throws NotFound when the question is missing', async () => {
    await expect(
      new GetQuestaoUseCase(new FakeRepo(null)).execute('u1', 'q1'),
    ).rejects.toBeInstanceOf(QuestaoNotFoundError);
  });

  it('throws Forbidden when the question belongs to another user', async () => {
    await expect(
      new GetQuestaoUseCase(new FakeRepo(owned('other'))).execute('u1', 'q1'),
    ).rejects.toBeInstanceOf(QuestaoForbiddenError);
  });

  it('updates an owned question', async () => {
    const repo = new FakeRepo(owned('u1'));
    const res = await new UpdateQuestaoUseCase(repo).execute('u1', 'q1', { gabarito: 'B' });
    expect(res).toEqual({ success: true });
    expect(repo.updated).toEqual([{ id: 'q1', patch: { gabarito: 'B' } }]);
  });

  it('removes an owned question', async () => {
    const repo = new FakeRepo(owned('u1'));
    await new RemoveQuestaoUseCase(repo).execute('u1', 'q1');
    expect(repo.deleted).toEqual(['q1']);
  });
});
