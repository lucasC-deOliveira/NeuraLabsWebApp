// Lógica pura da melhoria de questão por IA. Economia de tokens: prompt só com a
// questão + instruções das operações escolhidas. A CORREÇÃO é preservada — o
// gabarito, as letras e a quantidade de alternativas nunca mudam (só os textos).

import type { LlmMessage } from '../ports/llm-port';
import { type ImproveOperation } from './improve-operations';

export { normalizeOperations } from './improve-operations';

export interface QuestaoAlternativa {
  letra: string;
  texto: string;
}

export interface QuestaoContent {
  tipo: string;
  enunciado: string;
  alternativas: QuestaoAlternativa[];
  gabarito: string;
  explicacao: string;
}

export interface ImprovedQuestao {
  enunciado: string;
  alternativas: QuestaoAlternativa[];
  explicacao: string;
}

export const QUESTAO_OP_INSTRUCTIONS: Record<ImproveOperation, string> = {
  format:
    '- Formatação e estrutura: organize o enunciado e as alternativas com clareza, remova ruído. NÃO invente conteúdo.',
  markdown:
    '- Estilo Markdown: use **negrito** em termos-chave, `código` em símbolos/fórmulas e listas quando fizer sentido.',
  content:
    '- Conteúdo: corrija erros de português e melhore a clareza, mantendo o sentido. NÃO invente fatos nem mude qual alternativa é a correta.',
};

const SYSTEM_PROMPT =
  'Você melhora questões de prova. Aplique SOMENTE as melhorias pedidas, preserve o idioma, o sentido e a CORREÇÃO: ' +
  'NÃO mude o gabarito nem qual alternativa é a certa, e mantenha as MESMAS letras e a mesma quantidade de alternativas. ' +
  'Devolva um campo inalterado se já estiver bom. Responda em JSON: ' +
  '{"enunciado": string, "alternativas": [{"letra": string, "texto": string}], "explicacao": string}.';

/**
 * Monta as mensagens do LLM com a questão e só as instruções das operações ativas.
 * @example improveQuestaoMessages(content, ['markdown'])
 */
export function improveQuestaoMessages(
  content: QuestaoContent,
  operations: ImproveOperation[],
): LlmMessage[] {
  const instructions = operations.map((op) => QUESTAO_OP_INSTRUCTIONS[op]).join('\n');
  const user = `Melhorias pedidas:\n${instructions}\n\nQUESTÃO (JSON):\n${JSON.stringify(content)}`;
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user },
  ];
}

/** Orçamento de tokens proporcional ao conteúdo, com teto. */
export function improveQuestaoMaxTokens(content: QuestaoContent): number {
  const alts = content.alternativas.reduce((sum, a) => sum + a.texto.length, 0);
  const chars = content.enunciado.length + content.explicacao.length + alts;
  return Math.min(2500, 500 + Math.ceil(chars / 2));
}

/** Extrai a versão melhorada, preservando letras/gabarito (só troca textos). */
export function parseImprovedQuestao(raw: unknown, fallback: QuestaoContent): ImprovedQuestao {
  const out = raw as { enunciado?: unknown; alternativas?: unknown; explicacao?: unknown };
  return {
    enunciado: keepOrReplace(out?.enunciado, fallback.enunciado),
    alternativas: mergeAlternativas(out?.alternativas, fallback.alternativas),
    explicacao: keepOrReplace(out?.explicacao, fallback.explicacao),
  };
}

// Mantém as alternativas originais (ordem, letras, quantidade) e só substitui o
// texto quando o modelo devolveu um novo texto válido para aquela letra.
function mergeAlternativas(raw: unknown, fallback: QuestaoAlternativa[]): QuestaoAlternativa[] {
  const byLetra = new Map<string, string>();
  for (const item of Array.isArray(raw) ? raw : []) {
    const alt = item as { letra?: unknown; texto?: unknown };
    if (typeof alt?.letra === 'string' && typeof alt?.texto === 'string' && alt.texto.trim()) {
      byLetra.set(alt.letra, alt.texto);
    }
  }
  return fallback.map((a) => ({ letra: a.letra, texto: byLetra.get(a.letra) ?? a.texto }));
}

function keepOrReplace(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}
