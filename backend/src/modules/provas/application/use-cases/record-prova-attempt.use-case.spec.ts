import { describe, it, expect, beforeEach } from 'vitest';
import { RecordProvaAttemptUseCase } from './record-prova-attempt.use-case';
import { EmptyAttemptError } from '../../domain/errors';
import type {
  ProvaAttemptInput,
  ProvaAttemptRepository,
} from '../../domain/ports/prova-attempt-repository';

class FakeProvaAttemptRepository implements ProvaAttemptRepository {
  saved: { userId: string; attempt: ProvaAttemptInput }[] = [];
  async save(userId: string, attempt: ProvaAttemptInput): Promise<{ id: string }> {
    this.saved.push({ userId, attempt });
    return { id: 'tent-1' };
  }
}

const attempt = (respostas: ProvaAttemptInput['respostas']): ProvaAttemptInput => ({
  provaId: 'p1',
  acertos: respostas.filter((r) => r.acertou).length,
  total: respostas.length,
  tempoTotalMs: 60_000,
  respostas,
});

describe('RecordProvaAttemptUseCase', () => {
  let repo: FakeProvaAttemptRepository;
  let useCase: RecordProvaAttemptUseCase;

  beforeEach(() => {
    repo = new FakeProvaAttemptRepository();
    useCase = new RecordProvaAttemptUseCase(repo);
  });

  it('saves the attempt for the user and returns its id', async () => {
    const input = attempt([
      { questaoId: 'q1', respostaEscolhida: 'A', acertou: true, tempoRespostaMs: 5000 },
    ]);
    const result = await useCase.execute('u1', input);
    expect(result).toEqual({ id: 'tent-1' });
    expect(repo.saved[0]).toEqual({ userId: 'u1', attempt: input });
  });

  it('rejects an attempt without answers', async () => {
    await expect(useCase.execute('u1', attempt([]))).rejects.toBeInstanceOf(EmptyAttemptError);
    expect(repo.saved).toHaveLength(0);
  });
});
