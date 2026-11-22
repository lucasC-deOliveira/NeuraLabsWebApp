import { expect, it } from 'vitest';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';
import { AnalyzeBookPassageUseCase } from './analyze-book-passage.use-case';

class FakeBookPassageProvider implements LlmPort {
  request?: LlmRequest;

  async complete(request: LlmRequest): Promise<string> {
    this.request = request;
    return '```json\n{"ideas":[],"connections":[]}\n```';
  }
}

it('uses the requesting user provider and parses its structured reply', async () => {
  const provider = new FakeBookPassageProvider();
  const passage = { chapter: 'Introduction', text: 'Excerpt to analyze.', priorIdeas: [] };
  const result = await new AnalyzeBookPassageUseCase(provider).execute('reader-1', passage);
  expect(result).toEqual({ ideas: [], connections: [] });
  expect(provider.request?.userId).toBe('reader-1');
  expect(provider.request?.messages.at(-1)).toEqual({
    role: 'user',
    content: JSON.stringify(passage),
  });
});
