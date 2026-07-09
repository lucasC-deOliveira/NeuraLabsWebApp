import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PlanGraphFromEditalUseCase } from './plan-graph-from-edital.use-case';
import { EmptyTextError } from '../../domain/errors';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

const edital = readFileSync(
  join(__dirname, '../../domain/services/__fixtures__/edital-serpro-2023.txt'),
  'utf8',
);

class FakeNames implements GraphNameIndexRepository {
  async loadNameIndex(): Promise<{ nameIndex: Map<string, string>; existingContext: string }> {
    return { nameIndex: new Map(), existingContext: '\n\nNÓS JÁ NO GRAFO: "Coesão textual"' };
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

describe('PlanGraphFromEditalUseCase', () => {
  it('rejects an edital without a content program, without calling the model', async () => {
    const llm = new FakeLlm('{}');
    const useCase = new PlanGraphFromEditalUseCase(new FakeNames(), llm);
    await expect(useCase.execute('u1', 'g1', 'edital sem programa')).rejects.toBeInstanceOf(
      EmptyTextError,
    );
    expect(llm.lastRequest).toBeNull();
  });

  it('feeds only the isolated syllabus (with existing-node context) to the model', async () => {
    const llm = new FakeLlm(
      '{"assuntos":[{"nome":"LP","topicos":[{"nome":"t","conceitos":["c"]}]}]}',
    );
    const useCase = new PlanGraphFromEditalUseCase(new FakeNames(), llm);
    const res = await useCase.execute('u1', 'g1', edital);

    expect(res.plan.assuntos[0].nome).toBe('LP');
    const user = llm.lastRequest?.messages.find((m) => m.role === 'user')?.content ?? '';
    expect(user).toContain('LÍNGUA PORTUGUESA'); // syllabus present
    expect(user).not.toContain('folha de respostas'); // grading noise stripped
    expect(user.length).toBeLessThan(15000);
    const system = llm.lastRequest?.messages.find((m) => m.role === 'system')?.content ?? '';
    expect(system).toContain('NÓS JÁ NO GRAFO');
  });
});
