// Auxílios de estudo por IA para um card com o qual o usuário tropeça, durante a
// sessão. Dois modos, com uma diferença que define o desenho:
//
// - `hint`: dica socrática — uma pergunta que aproxima da resposta SEM entregá-la.
//   A resposta nem entra no prompt: o modelo não pode vazar o que não recebe.
// - `mnemonic`: um truque para FIXAR a resposta, então precisa dela.
//
// Lógica pura (prompt + parsing). Quem chama a LLM é o use-case.
import { parseAiJson } from './ai-json';
import type { LlmMessage } from '../ports/llm-port';

export type StudyAidMode = 'hint' | 'mnemonic';

export interface StudyAidCard {
  pergunta: string;
  resposta: string;
  conceito: string | null;
}

// Curto de propósito: dica e mnemônico são uma frase, não um texto.
const MAX_TOKENS = 250;

const HINT_SYSTEM =
  'Você é um tutor socrático. O aluno travou num flashcard. Dê UMA dica curta que o ' +
  'aproxime da resposta — uma pergunta orientadora ou uma pista. NÃO revele a resposta ' +
  'nem a escreva de nenhuma forma; a graça é o aluno chegar nela. Uma frase.\n' +
  'JSON: {"texto":"sua dica"}';

const MNEMONIC_SYSTEM =
  'Você é um tutor. O aluno erra sempre este flashcard. Crie UM mnemônico ou associação ' +
  'curta que ajude a fixar a resposta (imagem, acrônimo, trocadilho, história mínima). ' +
  'Uma ou duas frases.\n' +
  'JSON: {"texto":"seu mnemônico"}';

/**
 * Mensagens para a LLM gerar a dica/mnemônico do card.
 * @example buildStudyAidMessages('hint', { pergunta, resposta, conceito })
 */
export function buildStudyAidMessages(mode: StudyAidMode, card: StudyAidCard): LlmMessage[] {
  if (mode === 'hint') return [systemFor(mode), hintUser(card)];
  if (mode === 'mnemonic') return [systemFor(mode), mnemonicUser(card)];
  throw new Error(`invalid study aid mode: "${mode}". Expected: hint|mnemonic`);
}

/**
 * Extrai o texto do JSON do modelo; string vazia quando não veio nada usável.
 * Um auxílio é opcional — se o modelo respondeu lixo, some, não derruba a sessão.
 */
export function parseStudyAid(raw: string): string {
  const parsed = tryParse(raw);
  return typeof parsed?.texto === 'string' ? parsed.texto.trim() : '';
}

function tryParse(raw: string): { texto?: unknown } | null {
  try {
    return parseAiJson(raw || '{}') as { texto?: unknown };
  } catch {
    return null;
  }
}

export function studyAidMaxTokens(): number {
  return MAX_TOKENS;
}

function systemFor(mode: StudyAidMode): LlmMessage {
  return { role: 'system', content: mode === 'hint' ? HINT_SYSTEM : MNEMONIC_SYSTEM };
}

function hintUser(card: StudyAidCard): LlmMessage {
  const contexto = card.conceito ? ` (conceito: ${card.conceito})` : '';
  return { role: 'user', content: `Pergunta do card${contexto}:\n${card.pergunta}` };
}

function mnemonicUser(card: StudyAidCard): LlmMessage {
  const contexto = card.conceito ? ` (conceito: ${card.conceito})` : '';
  return {
    role: 'user',
    content: `Pergunta${contexto}:\n${card.pergunta}\n\nResposta a fixar:\n${card.resposta}`,
  };
}
