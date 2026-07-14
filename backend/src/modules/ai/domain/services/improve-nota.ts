// Lógica pura da melhoria de nota (Zettelkasten) por IA. Economia de tokens: o
// prompt só carrega a nota e as instruções das operações escolhidas. Uma chamada
// trata título e conteúdo.

import type { LlmMessage } from '../ports/llm-port';
import { type ImproveOperation } from './improve-operations';

export { normalizeOperations } from './improve-operations';

export interface NotaContent {
  titulo: string;
  conteudo: string;
}

const OP_INSTRUCTIONS: Record<ImproveOperation, string> = {
  format:
    '- Formatação e estrutura: organize em seções, parágrafos e listas claras, remova ruído. NÃO invente conteúdo.',
  markdown:
    '- Estilo Markdown: use títulos (##), **negrito** em termos-chave, `código`, listas e tabelas quando fizer sentido.',
  content:
    '- Conteúdo: corrija erros, melhore a clareza e complete lacunas óbvias, mantendo-se fiel à nota. NÃO invente fatos.',
};

const SYSTEM_PROMPT =
  'Você melhora notas de estudo (Zettelkasten). Aplique SOMENTE as melhorias pedidas, preserve o idioma e o sentido, ' +
  'e devolva markdown limpo no conteúdo. Se um campo já estiver bom, devolva-o inalterado. ' +
  'Responda em JSON: {"titulo": string, "conteudo": string}.';

/**
 * Monta as mensagens do LLM só com a nota e as instruções das operações ativas.
 * @example improveNotaMessages({ titulo, conteudo }, ['markdown'])
 */
export function improveNotaMessages(
  content: NotaContent,
  operations: ImproveOperation[],
): LlmMessage[] {
  const instructions = operations.map((op) => OP_INSTRUCTIONS[op]).join('\n');
  const user = `Melhorias pedidas:\n${instructions}\n\nNOTA (JSON):\n${JSON.stringify(content)}`;
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user },
  ];
}

/** Orçamento de tokens proporcional ao conteúdo (notas podem ser longas), com teto. */
export function improveNotaMaxTokens(content: NotaContent): number {
  const chars = content.titulo.length + content.conteudo.length;
  return Math.min(4000, 500 + Math.ceil(chars / 2));
}

/** Extrai a versão melhorada; mantém o campo original quando o modelo o omite. */
export function parseImprovedNota(raw: unknown, fallback: NotaContent): NotaContent {
  const out = raw as { titulo?: unknown; conteudo?: unknown };
  return {
    titulo: keepOrReplace(out?.titulo, fallback.titulo),
    conteudo: keepOrReplace(out?.conteudo, fallback.conteudo),
  };
}

function keepOrReplace(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}
