// Prompt that maps flashcards into the ASSUNTO → TÓPICO → CONCEITO hierarchy.
// Shared by the whole-deck population and the chunked classification flows —
// same JSON contract, normalized by `normalizePopulationPlan`.

import type { LlmMessage } from '../ports/llm-port';

export interface PromptFlashcard {
  pergunta: string;
  resposta: string;
}

export function buildPopulationMessages(
  titulo: string,
  flashcards: PromptFlashcard[],
  existingContext: string,
): LlmMessage[] {
  const fcLines = flashcards
    .map((fc, i) => `[${i}] P: ${fc.pergunta.trim()}\n    R: ${fc.resposta.trim()}`)
    .join('\n\n');
  const last = flashcards.length - 1;
  return [
    { role: 'system', content: systemPrompt(existingContext) },
    { role: 'user', content: userPrompt(titulo, flashcards.length, fcLines, last) },
  ];
}

function systemPrompt(existingContext: string): string {
  return `Você é especialista em pedagogia e organização do conhecimento.
Dado um conjunto de flashcards, mapeie cada um para a hierarquia: ASSUNTO → TÓPICO → CONCEITO.
Responda APENAS com JSON válido, sem texto extra.${existingContext}`;
}

function userPrompt(titulo: string, total: number, fcLines: string, last: number): string {
  return `Baralho: "${titulo}" (${total} flashcards)

${fcLines}

Regras:
- Cada flashcard DEVE estar em "indices" de pelo menos um CONCEITO
- Agrupe flashcards do mesmo conceito; não crie um conceito por flashcard se forem semelhantes
- Reutilize os nomes dos nós já existentes no grafo quando fizer sentido (evite duplicar)
- Nomes concisos em português

Formato de resposta:
{
  "assuntos": [{ "nome": "string", "descricao": "string" }],
  "topicos": [{ "nome": "string", "assunto": "nome exato do assunto", "descricao": "string" }],
  "conceitos": [{ "nome": "string", "topico": "nome exato do tópico", "descricao": "string", "indices": [0, 1, 2] }]
}

"indices" são os índices [0..${last}] dos flashcards que esse conceito representa.`;
}
