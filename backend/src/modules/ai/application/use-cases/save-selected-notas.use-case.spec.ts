import { describe, it, expect } from 'vitest';
import { SaveSelectedNotasUseCase } from './save-selected-notas.use-case';
import type { CurriculumRepository } from '../../domain/ports/curriculum-repository';
import type { ExistingCurriculum } from '../../domain/services/curriculum-plan';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeRepo implements CurriculumRepository {
  assuntos: string[] = [];
  topicos: Array<{ assuntoId: string; nome: string }> = [];
  conceitos: Array<{ topicoId: string; nome: string }> = [];
  notas: Array<{ titulo: string; conteudo: string }> = [];
  private seq = 0;
  constructor(private readonly existing: ExistingCurriculum) {}
  async loadExisting(): Promise<ExistingCurriculum> {
    return this.existing;
  }
  async createAssunto(_u: string, nome: string): Promise<string> {
    this.assuntos.push(nome);
    return `a${++this.seq}`;
  }
  async createTopico(_u: string, assuntoId: string, nome: string): Promise<string> {
    this.topicos.push({ assuntoId, nome });
    return `t${++this.seq}`;
  }
  async createConceito(_u: string, topicoId: string, nome: string): Promise<string> {
    this.conceitos.push({ topicoId, nome });
    return `c${++this.seq}`;
  }
  async createNota(_u: string, titulo: string, conteudo: string): Promise<string> {
    this.notas.push({ titulo, conteudo });
    return `n${++this.seq}`;
  }
}

class FakeLlm implements LlmPort {
  lastRequest: LlmRequest | null = null;
  constructor(private readonly response: string) {}
  async complete(request: LlmRequest): Promise<string> {
    this.lastRequest = request;
    return this.response;
  }
}

const empty: ExistingCurriculum = { assuntos: [], topicos: [], conceitos: [] };

describe('SaveSelectedNotasUseCase', () => {
  it('returns no ids and skips the model for an empty selection', async () => {
    const repo = new FakeRepo(empty);
    const llm = new FakeLlm('{}');
    const useCase = new SaveSelectedNotasUseCase(repo, llm);
    expect(await useCase.execute('u1', [])).toEqual({ notaIds: [] });
    expect(llm.lastRequest).toBeNull();
  });

  it('builds the hierarchy and saves the notes with a markdown heading', async () => {
    const repo = new FakeRepo(empty);
    const llm = new FakeLlm(
      JSON.stringify({
        assuntos: [{ nome: 'Bio', topicos: ['Célula'] }],
        topicos: [{ nome: 'Célula', conceitos: ['Mitose'] }],
        conceitos: [],
      }),
    );
    const useCase = new SaveSelectedNotasUseCase(repo, llm);

    const res = await useCase.execute('u1', [{ titulo: 'N1', conteudo: 'corpo' }]);

    expect(res.notaIds).toHaveLength(1);
    expect(repo.assuntos).toEqual(['Bio']);
    expect(repo.topicos).toEqual([{ assuntoId: 'a1', nome: 'Célula' }]);
    expect(repo.conceitos).toEqual([{ topicoId: 't2', nome: 'Mitose' }]);
    expect(repo.notas).toEqual([{ titulo: 'N1', conteudo: '# N1\n\ncorpo' }]);
  });

  it('falls back to a "Geral" subject/topic for an orphan concept', async () => {
    const repo = new FakeRepo(empty);
    const llm = new FakeLlm(JSON.stringify({ conceitos: [{ nome: 'Solto' }] }));
    const useCase = new SaveSelectedNotasUseCase(repo, llm);
    await useCase.execute('u1', [{ titulo: 'N', conteudo: 'c' }]);
    expect(repo.assuntos).toEqual(['Geral']);
    expect(repo.topicos).toEqual([{ assuntoId: 'a1', nome: 'Geral' }]);
    expect(repo.conceitos).toEqual([{ topicoId: 't2', nome: 'Solto' }]);
  });
});
