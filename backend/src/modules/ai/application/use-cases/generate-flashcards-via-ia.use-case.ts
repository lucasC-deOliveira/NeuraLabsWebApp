import { NoteNotFoundError } from '../../domain/errors';
import { parseAiJson } from '../../domain/services/ai-json';
import type {
  ConceptRef,
  FlashcardSourceRepository,
} from '../../domain/ports/flashcard-source-repository';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';
import {
  makeConceptResolver,
  type FlashcardPreview,
  type FlashcardSourceType,
} from '../../../../content/flashcard-gen';

interface RawAiFlashcard {
  pergunta?: unknown;
  resposta?: unknown;
  tipo?: unknown;
  conceito?: unknown;
}

type ConceptResolver = (term: string) => ConceptRef | null;

/**
 * Generates varied flashcard previews from a note's content via the model,
 * attaching each to a user concept. Unparseable output is rejected.
 * @example generateFlashcards.execute('u1', 'nota1')
 */
export class GenerateFlashcardsViaIaUseCase {
  constructor(
    private readonly repo: FlashcardSourceRepository,
    private readonly llm: LlmPort,
  ) {}

  async execute(userId: string, notaId: string): Promise<FlashcardPreview[]> {
    const nota = await this.repo.loadNote(userId, notaId);
    if (!nota) throw new NoteNotFoundError();
    const concepts = await this.repo.loadConcepts(userId);
    const content = await this.llm.complete({
      userId,
      temperature: 0.5,
      messages: buildMessages(nota.conteudo, concepts),
    });
    if (!content) return [];
    const parsed = parseAiJson(content) as { flashcards?: unknown };
    return this.buildPreviews(asCards(parsed?.flashcards), concepts);
  }

  private buildPreviews(raw: RawAiFlashcard[], concepts: ConceptRef[]): FlashcardPreview[] {
    const { resolveFallback } = makeConceptResolver(concepts);
    const out: FlashcardPreview[] = [];
    for (const fc of raw) {
      const card = toPreview(fc, resolveFallback);
      if (card) out.push(card);
    }
    return out;
  }
}

function toPreview(fc: RawAiFlashcard, resolve: ConceptResolver): FlashcardPreview | null {
  const pergunta = nonEmpty(fc.pergunta);
  const resposta = nonEmpty(fc.resposta);
  if (!pergunta || !resposta) return null;
  const conceito = typeof fc.conceito === 'string' ? fc.conceito : '';
  const target = resolve(conceito);
  if (!target) return null;
  return {
    id: newId(),
    pergunta,
    resposta,
    conceitoId: target.id,
    conceptNome: conceito === 'desconhecido' ? undefined : target.nome,
    source: sourceOf(fc.tipo),
  };
}

const nonEmpty = (v: unknown): string => (typeof v === 'string' && v.trim() ? v : '');
const sourceOf = (tipo: unknown): FlashcardSourceType =>
  (typeof tipo === 'string' ? tipo : 'pergunta_resposta') as FlashcardSourceType;
const asCards = (v: unknown): RawAiFlashcard[] => (Array.isArray(v) ? (v as RawAiFlashcard[]) : []);
const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

function buildMessages(conteudo: string, concepts: ConceptRef[]): LlmMessage[] {
  const conceptContext = concepts.map((c) => `- ${c.nome}`).join('\n');
  return [
    { role: 'system', content: systemPrompt(conceptContext) },
    { role: 'user', content: conteudo.slice(0, 15000) },
  ];
}

function systemPrompt(conceptContext: string): string {
  return `Você é um especialista em criação de flashcards educacionais. A partir do texto, gere flashcards variados usando os tipos:
- pergunta_resposta: Pergunta direta → Resposta.
- cloze: Preenchimento de lacuna. Ex: "A mitocôndria produz {{...}}." → "ATP"
- bidirecional: Dupla direção (ida e volta).
- explicacao_profunda: Conceito → Explicação detalhada em etapas.
- comparacao: Diferença entre conceitos similares.
- lista_fragmentada: Cite N pontos/funções (máximo 3-4 por card).
- aplicacao_problema: Cenário/situação que testa o conhecimento.
- erro_comum: Erro frequente sobre o tema → Explicação do erro correto.
- identificacao: Identificar/conceituar a partir de descrição.

Regras: use o conteúdo como base para TODAS as respostas; tipos variados; respostas concisas; vincule cada flashcard a um conceito da lista quando possível; gere entre 5-15 flashcards; português brasileiro.
Responda APENAS JSON: {"flashcards":[{"pergunta":"...","resposta":"...","tipo":"pergunta_resposta","conceito":"nome ou desconhecido"}]}

Conceitos disponíveis:
${conceptContext}`;
}
