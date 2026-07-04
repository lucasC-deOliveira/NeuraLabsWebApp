import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CreateProvaUseCase } from './create-prova.use-case';
import { CreateProvaFromParsedUseCase } from './create-prova-from-parsed.use-case';
import { ListProvasUseCase } from './list-provas.use-case';
import { GetProvaUseCase } from './get-prova.use-case';
import { UpdateProvaUseCase } from './update-prova.use-case';
import { RemoveProvaUseCase } from './remove-prova.use-case';
import { ParseExamUploadUseCase } from './parse-exam-upload.use-case';
import { ProvaForbiddenError, ProvaNotFoundError } from '../../domain/errors';
import type { ProvaRepository } from '../../domain/ports/prova-repository';
import type {
  CreateProvaFromParsedInput,
  CreateProvaInput,
  OwnedProvaDetail,
  ProvaSummary,
  UpdateProvaPatch,
} from '../../domain/prova';
import type {
  DocumentTextExtractor,
  UploadedDocument,
} from '../../domain/ports/document-text-extractor';
import type { ExamLlmPort, ExamLlmRequest } from '../../domain/ports/exam-llm';

const detail = (usuarioId: string): OwnedProvaDetail => ({
  usuarioId,
  detail: { id: 'p1', titulo: 'T', descricao: null, dataCriacao: new Date(0), questoes: [] },
});

class FakeProvaRepository implements ProvaRepository {
  updated: Array<{ id: string; patch: UpdateProvaPatch }> = [];
  deleted: string[] = [];
  constructor(private readonly stored: OwnedProvaDetail | null = null) {}
  async create(): Promise<string> {
    return 'new-id';
  }
  async createFromParsed(): Promise<string> {
    return 'parsed-id';
  }
  async listByUser(): Promise<ProvaSummary[]> {
    return this.stored
      ? [{ id: 'p1', titulo: 'T', descricao: null, totalQuestoes: 0, dataCriacao: new Date(0) }]
      : [];
  }
  async findDetail(): Promise<OwnedProvaDetail | null> {
    return this.stored;
  }
  async findOwner(): Promise<{ usuarioId: string } | null> {
    return this.stored ? { usuarioId: this.stored.usuarioId } : null;
  }
  async update(id: string, patch: UpdateProvaPatch): Promise<void> {
    this.updated.push({ id, patch });
  }
  async delete(id: string): Promise<void> {
    this.deleted.push(id);
  }
}

class FakeTextExtractor implements DocumentTextExtractor {
  async extract(document: UploadedDocument): Promise<string> {
    return `text:${document.originalname}`;
  }
}

class StubExtractor implements DocumentTextExtractor {
  constructor(private readonly text: string) {}
  async extract(): Promise<string> {
    return this.text;
  }
}

class FakeExamLlm implements ExamLlmPort {
  lastRequest: ExamLlmRequest | null = null;
  constructor(private readonly response: string) {}
  async complete(request: ExamLlmRequest): Promise<string> {
    this.lastRequest = request;
    return this.response;
  }
}

const createInput: CreateProvaInput = { titulo: 'T', questaoIds: ['q1'] };
const fromParsedInput: CreateProvaFromParsedInput = { titulo: 'T', questoes: [] };
const file = (name: string): UploadedDocument => ({
  buffer: Buffer.from(''),
  mimetype: 'text/plain',
  originalname: name,
});

describe('provas use-cases', () => {
  it('creates a prova and returns its id', async () => {
    expect(
      await new CreateProvaUseCase(new FakeProvaRepository()).execute('u1', createInput),
    ).toEqual({ provaId: 'new-id' });
  });

  it('creates a prova from parsed questions', async () => {
    expect(
      await new CreateProvaFromParsedUseCase(new FakeProvaRepository()).execute(
        'u1',
        fromParsedInput,
      ),
    ).toEqual({ provaId: 'parsed-id' });
  });

  it('lists the user provas', async () => {
    const res = await new ListProvasUseCase(new FakeProvaRepository(detail('u1'))).execute('u1');
    expect(res).toHaveLength(1);
  });

  it('gets an owned prova without leaking usuarioId', async () => {
    const res = await new GetProvaUseCase(new FakeProvaRepository(detail('u1'))).execute(
      'u1',
      'p1',
    );
    expect(res.id).toBe('p1');
    expect('usuarioId' in res).toBe(false);
  });

  it('throws NotFound when the prova is missing', async () => {
    await expect(
      new GetProvaUseCase(new FakeProvaRepository(null)).execute('u1', 'p1'),
    ).rejects.toBeInstanceOf(ProvaNotFoundError);
  });

  it('throws Forbidden when the prova belongs to another user', async () => {
    await expect(
      new GetProvaUseCase(new FakeProvaRepository(detail('other'))).execute('u1', 'p1'),
    ).rejects.toBeInstanceOf(ProvaForbiddenError);
  });

  it('updates an owned prova', async () => {
    const repo = new FakeProvaRepository(detail('u1'));
    const res = await new UpdateProvaUseCase(repo).execute('u1', 'p1', { titulo: 'Novo' });
    expect(res).toEqual({ success: true });
    expect(repo.updated).toEqual([{ id: 'p1', patch: { titulo: 'Novo' } }]);
  });

  it('refuses to update a prova owned by another user', async () => {
    const repo = new FakeProvaRepository(detail('other'));
    await expect(
      new UpdateProvaUseCase(repo).execute('u1', 'p1', { titulo: 'Novo' }),
    ).rejects.toBeInstanceOf(ProvaForbiddenError);
    expect(repo.updated).toEqual([]);
  });

  it('removes an owned prova', async () => {
    const repo = new FakeProvaRepository(detail('u1'));
    await new RemoveProvaUseCase(repo).execute('u1', 'p1');
    expect(repo.deleted).toEqual(['p1']);
  });

  it('parses an upload: extracts both docs and parses the LLM output', async () => {
    const llm = new FakeExamLlm(
      JSON.stringify({ questoes: [{ enunciado: 'E', tipo: 'VERDADEIRO_FALSO', gabarito: 'v' }] }),
    );
    const useCase = new ParseExamUploadUseCase(new FakeTextExtractor(), llm);
    const result = await useCase.execute('u1', file('prova.txt'), file('gab.txt'));
    expect(result.questoes[0].gabarito).toBe('V');
    expect(llm.lastRequest?.userId).toBe('u1');
    expect(llm.lastRequest?.temperature).toBe(0.1);
    expect(llm.lastRequest?.messages[0].content).toContain('text:prova.txt');
    expect(llm.lastRequest?.messages[0].content).toContain('text:gab.txt');
  });

  it('parses a structured MC exam (ENEM) deterministically, without calling the LLM', async () => {
    const enem = readFileSync(
      join(__dirname, '../../domain/services/__fixtures__/enem-4pages.txt'),
      'utf8',
    );
    const llm = new FakeExamLlm('{}');
    const useCase = new ParseExamUploadUseCase(new StubExtractor(enem), llm);
    const result = await useCase.execute('u1', file('prova.pdf'));
    expect(result.questoes[0].numero).toBe(91);
    expect(result.questoes.every((q) => q.gabarito === '?')).toBe(true);
    expect(llm.lastRequest).toBeNull(); // 0 tokens de IA
  });

  it('parses an upload without a gabarito: only the prova is sent, gabaritos stay "?"', async () => {
    const llm = new FakeExamLlm(
      JSON.stringify({ questoes: [{ enunciado: 'E', tipo: 'MULTIPLA_ESCOLHA', alternativas: [{ letra: 'A', texto: 'a' }], gabarito: '?' }] }),
    );
    const useCase = new ParseExamUploadUseCase(new FakeTextExtractor(), llm);
    const result = await useCase.execute('u1', file('prova.txt'));
    expect(result.questoes[0].gabarito).toBe('?');
    const content = llm.lastRequest?.messages[0].content ?? '';
    expect(content).toContain('text:prova.txt');
    expect(content).not.toContain('=== GABARITO ===');
  });
});
