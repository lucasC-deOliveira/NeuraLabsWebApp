// Lógica pura da melhoria de flashcard por IA. Economia de tokens: o prompt só
// carrega o conteúdo do flashcard e AS instruções das operações escolhidas (nada
// do grafo). Uma única chamada trata pergunta e resposta.

import type { LlmMessage } from '../ports/llm-port';
import { type ImproveOperation } from './improve-operations';

export { normalizeOperations, type ImproveOperation } from './improve-operations';

export interface FlashcardContent {
  pergunta: string;
  resposta: string;
}

const OP_INSTRUCTIONS: Record<ImproveOperation, string> = {
  format:
    '- Formatação e estrutura: organize em parágrafos/linhas claras, remova ruído e repetição. NÃO invente conteúdo.',
  markdown:
    '- Estilo Markdown: use **negrito** em termos-chave, `código` em termos técnicos/símbolos e listas quando fizer sentido. Sem títulos grandes.',
  content:
    '- Conteúdo: corrija erros, melhore a clareza e complete lacunas óbvias, mantendo-se fiel ao conceito. NÃO invente fatos.',
};

const SYSTEM_PROMPT =
  'Você melhora flashcards de estudo. Aplique SOMENTE as melhorias pedidas, preserve o idioma e o sentido, e devolva markdown limpo. ' +
  'Se um campo já estiver bom, devolva-o inalterado. Responda em JSON: {"pergunta": string, "resposta": string}.';

/**
 * Monta as mensagens do LLM só com o conteúdo e as instruções das operações ativas.
 * @example improveFlashcardMessages({ pergunta, resposta }, ['markdown'])
 */
export function improveFlashcardMessages(
  content: FlashcardContent,
  operations: ImproveOperation[],
): LlmMessage[] {
  const instructions = operations.map((op) => OP_INSTRUCTIONS[op]).join('\n');
  const user = `Melhorias pedidas:\n${instructions}\n\nFLASHCARD (JSON):\n${JSON.stringify(content)}`;
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user },
  ];
}

/** Orçamento de tokens proporcional ao conteúdo (curto → barato), com teto. */
export function improveMaxTokens(content: FlashcardContent): number {
  const chars = content.pergunta.length + content.resposta.length;
  return Math.min(2000, 400 + Math.ceil(chars / 2));
}

/** Extrai a versão melhorada; mantém o campo original quando o modelo o omite. */
export function parseImprovedFlashcard(raw: unknown, fallback: FlashcardContent): FlashcardContent {
  const out = raw as { pergunta?: unknown; resposta?: unknown };
  return {
    pergunta: keepOrReplace(out?.pergunta, fallback.pergunta),
    resposta: keepOrReplace(out?.resposta, fallback.resposta),
  };
}

function keepOrReplace(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}
