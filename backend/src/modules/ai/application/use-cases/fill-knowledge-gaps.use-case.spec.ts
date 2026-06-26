import { describe, it, expect } from 'vitest';
import { FillKnowledgeGapsUseCase } from './fill-knowledge-gaps.use-case';
import { EmptyAiContentError } from '../../domain/errors';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { GraphNodeInput, GraphNodeWriter } from '../../domain/ports/graph-node-writer';
import type { GraphEdgeInput, GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';
import type { NodeTypesRepository } from '../../domain/ports/node-types-repository';
import type { LlmPort } from '../../domain/ports/llm-port';

class FakeNames implements GraphNameIndexRepository {
  async loadNameIndex(): Promise<{ nameIndex: Map<string, string>; existingContext: string }> {
    return { nameIndex: new Map(), existingContext: '' };
  }
}

class FakeNodeWriter implements GraphNodeWriter {
  readonly created: GraphNodeInput[] = [];
  async createNode(_u: string, _g: string, input: GraphNodeInput): Promise<{ nodeId: string }> {
    this.created.push(input);
    return { nodeId: `n${this.created.length}` };
  }
}

class FakeEdgeWriter implements GraphEdgeWriter {
  readonly created: GraphEdgeInput[] = [];
  async createEdge(_u: string, _g: string, edge: GraphEdgeInput): Promise<void> {
    this.created.push(edge);
  }
}

class FakeTypes implements NodeTypesRepository {
  constructor(private readonly map: Map<string, string> = new Map()) {}
  async loadNodeTypes(): Promise<Map<string, string>> {
    return this.map;
  }
}

const gap = { nome: 'X', tipo: 'missing' as const, assuntoId: 'a1', assuntoNome: 'Bio' };

function build(llm: LlmPort, types = new FakeTypes()) {
  const nodeWriter = new FakeNodeWriter();
  const edgeWriter = new FakeEdgeWriter();
  const useCase = new FillKnowledgeGapsUseCase(new FakeNames(), nodeWriter, edgeWriter, types, llm);
  return { useCase, nodeWriter, edgeWriter };
}

class FakeLlm implements LlmPort {
  constructor(private readonly response: string) {}
  async complete(): Promise<string> {
    return this.response;
  }
}

describe('FillKnowledgeGapsUseCase', () => {
  it('returns zero counts when there are no gaps', async () => {
    const { useCase, nodeWriter } = build(new FakeLlm('{}'));
    expect(await useCase.execute('u1', 'g1', [])).toEqual({
      topicos: 0,
      conceitos: 0,
      notas: 0,
      flashcards: 0,
    });
    expect(nodeWriter.created).toHaveLength(0);
  });

  it('throws when the AI returns no content', async () => {
    const { useCase } = build(new FakeLlm(''));
    await expect(useCase.execute('u1', 'g1', [gap])).rejects.toBeInstanceOf(EmptyAiContentError);
  });

  it('creates the topic/concept/note/flashcard tree and links the subject', async () => {
    const llm = new FakeLlm(
      JSON.stringify({
        topicos: [
          {
            nome: 'T',
            assuntoId: 'a1',
            conceitos: [
              {
                nome: 'C',
                nota: { titulo: 'N', conteudo: 'txt' },
                flashcards: [{ pergunta: 'p', resposta: 'r' }],
              },
            ],
          },
        ],
      }),
    );
    const { useCase, nodeWriter, edgeWriter } = build(
      llm,
      new FakeTypes(new Map([['a1', 'ASSUNTO']])),
    );
    const counts = await useCase.execute('u1', 'g1', [gap]);
    expect(counts).toEqual({ topicos: 1, conceitos: 1, notas: 1, flashcards: 1 });
    expect(nodeWriter.created.map((n) => n.tipoNode)).toEqual([
      'TOPICO',
      'CONCEITO',
      'NOTA',
      'FLASHCARD',
    ]);
    expect(edgeWriter.created.map((e) => e.tipoRelacao)).toEqual([
      'PERTENCE_A',
      'PERTENCE_A',
      'EXPLICA',
      'HERDA',
    ]);
  });

  it('skips the subject edge when the assuntoId is not an ASSUNTO in the graph', async () => {
    const llm = new FakeLlm(JSON.stringify({ topicos: [{ nome: 'T', assuntoId: 'ghost' }] }));
    const { useCase, edgeWriter } = build(llm);
    await useCase.execute('u1', 'g1', [gap]);
    expect(edgeWriter.created).toHaveLength(0);
  });
});
