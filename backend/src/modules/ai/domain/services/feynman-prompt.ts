import type { LlmMessage } from '../ports/llm-port';
import type { FeynmanTargetContext } from '../ports/feynman-context-source';
import { feynmanRubric, type FeynmanAngulo } from './feynman-angulo';

const SYSTEM_PROMPT =
  'Você avalia uma explicação pela TÉCNICA FEYNMAN. ' +
  'Compare a EXPLICAÇÃO DO ALUNO com a REFERÊNCIA e o MATERIAL, seguindo o MODO indicado. ' +
  'Responda JSON: {"clareza":0-100,"jargao":["termo usado sem explicar/errado"],' +
  '"lacunas":[{"ponto":"ponto-chave que faltou","conceito":"nome EXATO de um conceito da lista, ou null"}],' +
  '"analogia":"uma analogia simples","reescrita":"a explicação reescrita para um iniciante"}. ' +
  'jargao/lacunas: máx 6 itens, strings curtas. ' +
  'Em lacunas.conceito use SOMENTE nomes da lista de conceitos (ou null). Não invente conceitos.';

// Monta as mensagens da avaliação Feynman: system + a régua do ângulo + o contexto do
// alvo + a explicação. O ângulo muda o que a IA premia/penaliza (ver feynman-angulo).
export function buildFeynmanMessages(
  ctx: FeynmanTargetContext,
  explicacao: string,
  angulo: FeynmanAngulo,
): LlmMessage[] {
  const material = ctx.material.length > 0 ? ctx.material.join('\n- ') : '(sem material)';
  const candidatos = ctx.candidatos.map((c) => c.nome).join(', ') || '(nenhum)';
  const user = [
    `ALVO: ${ctx.nome}`,
    `REFERÊNCIA: ${ctx.descricao || '(sem descrição)'}`,
    `MATERIAL:\n- ${material}`,
    `CONCEITOS PARA MAPEAR LACUNAS: ${candidatos}`,
    `EXPLICAÇÃO DO ALUNO:\n${explicacao}`,
  ].join('\n\n');
  return [
    { role: 'system', content: `${SYSTEM_PROMPT}\n${feynmanRubric(angulo)}` },
    { role: 'user', content: user },
  ];
}
