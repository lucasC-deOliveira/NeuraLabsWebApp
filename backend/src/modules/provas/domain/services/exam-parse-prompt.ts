import type { ExamLlmMessage } from '../ports/exam-llm';

// Hard caps on how much document text we feed the model, mirroring the original
// limits: the exam carries the questions (12k), the answer key is terse (4k).
const PROVA_CHAR_LIMIT = 12000;
const GABARITO_CHAR_LIMIT = 4000;

const JSON_FORMAT = `Retorne JSON exatamente neste formato:
{
  "tituloSugerido": "Nome da prova ou null",
  "questoes": [
    {
      "numero": 1,
      "enunciado": "Texto completo da questão",
      "tipo": "MULTIPLA_ESCOLHA",
      "alternativas": [
        {"letra": "A", "texto": "Texto da alternativa A"},
        {"letra": "B", "texto": "Texto da alternativa B"},
        {"letra": "C", "texto": "Texto da alternativa C"},
        {"letra": "D", "texto": "Texto da alternativa D"}
      ],
      "gabarito": "C",
      "explicacao": null
    },
    {
      "numero": 2,
      "enunciado": "A água ferve a 100°C ao nível do mar.",
      "tipo": "VERDADEIRO_FALSO",
      "alternativas": null,
      "gabarito": "V",
      "explicacao": null
    }
  ]
}`;

const INSTRUCTIONS = `Você receberá dois textos:
1. PROVA: texto extraído de um documento de prova/exame
2. GABARITO: texto extraído do gabarito correspondente

Sua tarefa:
- Extraia todas as questões da PROVA
- Para cada questão, determine o tipo: "VERDADEIRO_FALSO" ou "MULTIPLA_ESCOLHA"
- Para questões de múltipla escolha, extraia as alternativas (letras A, B, C, D, E ou a, b, c, d, e)
- Cruze com o GABARITO para preencher o campo gabarito de cada questão
  - Para V/F: use "V" ou "F"
  - Para múltipla escolha: use a letra maiúscula correta ("A", "B", "C", "D" ou "E")
- Se o título/nome da prova aparecer no texto, sugira como tituloSugerido

${JSON_FORMAT}

Regras importantes:
- Inclua todas as questões na ordem em que aparecem
- Se uma questão não tiver gabarito correspondente, use "?" como gabarito
- Preserve o enunciado completo, incluindo dados de contexto se houver
- Normalize as letras das alternativas para maiúsculas (A, B, C, D)
- Ignore cabeçalhos, instruções gerais e rodapés — apenas as questões`;

// Variant for when the user uploads only the exam (no answer key): extract the
// questions/alternatives but leave every gabarito as "?" for the user to fill in.
const INSTRUCTIONS_NO_GABARITO = `Você receberá um texto:
1. PROVA: texto extraído de um documento de prova/exame

Não há gabarito disponível.

Sua tarefa:
- Extraia todas as questões da PROVA
- Para cada questão, determine o tipo: "VERDADEIRO_FALSO" ou "MULTIPLA_ESCOLHA"
- Para questões de múltipla escolha, extraia as alternativas (letras A, B, C, D, E ou a, b, c, d, e)
- Como não há gabarito, use "?" no campo gabarito de TODAS as questões (o usuário informará o correto depois)
- Se o título/nome da prova aparecer no texto, sugira como tituloSugerido

${JSON_FORMAT}

Regras importantes:
- Inclua todas as questões na ordem em que aparecem
- Use sempre "?" no campo gabarito (não há gabarito para cruzar)
- Preserve o enunciado completo, incluindo dados de contexto se houver
- Normalize as letras das alternativas para maiúsculas (A, B, C, D)
- Ignore cabeçalhos, instruções gerais e rodapés — apenas as questões`;

/**
 * Builds the LLM prompt that extracts questions from an exam. With an answer key,
 * it cross-references it to fill each gabarito; without one, every gabarito is
 * left as "?" for the user to complete. Truncates each text to its char budget.
 * @example buildExamParsePrompt('Questão 1...', 'Gabarito: 1-C')
 * @example buildExamParsePrompt('Questão 1...') // sem gabarito
 */
export function buildExamParsePrompt(provaText: string, gabaritoText?: string): ExamLlmMessage[] {
  const prova = `=== PROVA ===\n${provaText.slice(0, PROVA_CHAR_LIMIT)}`;
  if (gabaritoText === undefined) {
    return [{ role: 'user', content: `${INSTRUCTIONS_NO_GABARITO}\n\n${prova}` }];
  }
  const gabarito = `=== GABARITO ===\n${gabaritoText.slice(0, GABARITO_CHAR_LIMIT)}`;
  return [{ role: 'user', content: `${INSTRUCTIONS}\n\n${prova}\n\n${gabarito}` }];
}
