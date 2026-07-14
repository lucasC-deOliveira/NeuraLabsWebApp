// Melhoria em LOTE de questões (usada ao importar uma prova): uma única chamada
// formata todas as questões, preservando numero/gabarito/letras de cada uma.
// Reusa a lógica por questão (parseImprovedQuestao) e as instruções de operação.

import type { LlmMessage } from '../ports/llm-port';
import { type ImproveOperation } from './improve-operations';
import {
  QUESTAO_OP_INSTRUCTIONS,
  parseImprovedQuestao,
  type QuestaoAlternativa,
  type QuestaoContent,
} from './improve-questao';

export { normalizeOperations } from './improve-operations';

export interface BatchQuestao extends QuestaoContent {
  numero: number;
}

export interface ImprovedBatchQuestao {
  numero: number;
  enunciado: string;
  alternativas: QuestaoAlternativa[];
  explicacao: string;
}

const SYSTEM_PROMPT =
  'Você melhora questões de prova em lote. Aplique SOMENTE as melhorias pedidas, preserve o idioma, o sentido e a ' +
  'CORREÇÃO: NÃO mude gabaritos, letras nem a quantidade de alternativas, e mantenha o "numero" de cada questão. ' +
  'Responda em JSON: {"questoes": [{"numero": number, "enunciado": string, ' +
  '"alternativas": [{"letra": string, "texto": string}], "explicacao": string}]}.';

/**
 * Monta a mensagem única do LLM com todas as questões e as instruções ativas.
 * @example improveProvaQuestoesMessages(questoes, ['markdown'])
 */
export function improveProvaQuestoesMessages(
  questoes: BatchQuestao[],
  operations: ImproveOperation[],
): LlmMessage[] {
  const instructions = operations.map((op) => QUESTAO_OP_INSTRUCTIONS[op]).join('\n');
  const user = `Melhorias pedidas:\n${instructions}\n\nQUESTÕES (JSON):\n${JSON.stringify({ questoes })}`;
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user },
  ];
}

/** Orçamento de tokens proporcional ao total das questões, com teto maior (lote). */
export function improveProvaQuestoesMaxTokens(questoes: BatchQuestao[]): number {
  const chars = questoes.reduce((sum, q) => sum + questaoChars(q), 0);
  return Math.min(8000, 800 + Math.ceil(chars / 2));
}

function questaoChars(q: BatchQuestao): number {
  const alts = q.alternativas.reduce((sum, a) => sum + a.texto.length, 0);
  return q.enunciado.length + q.explicacao.length + alts;
}

/** Casa cada questão original com a melhorada pelo numero, preservando gabarito/letras. */
export function parseImprovedProvaQuestoes(
  raw: unknown,
  fallback: BatchQuestao[],
): ImprovedBatchQuestao[] {
  const byNumero = indexByNumero(raw);
  return fallback.map((q) => {
    const improved = parseImprovedQuestao(byNumero.get(q.numero) ?? {}, q);
    return { numero: q.numero, ...improved };
  });
}

function indexByNumero(raw: unknown): Map<number, unknown> {
  const out = new Map<number, unknown>();
  const list = (raw as { questoes?: unknown })?.questoes;
  for (const item of Array.isArray(list) ? list : []) {
    const numero = (item as { numero?: unknown })?.numero;
    if (typeof numero === 'number') out.set(numero, item);
  }
  return out;
}
