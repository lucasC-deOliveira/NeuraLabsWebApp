import type { LlmMessage } from '../ports/llm-port';
import type { FeynmanTargetContext } from '../ports/feynman-context-source';

const SYSTEM_PROMPT =
  'Você avalia uma explicação pela TÉCNICA FEYNMAN (explicar como se ensinasse a uma criança). ' +
  'Compare a EXPLICAÇÃO DO ALUNO com a REFERÊNCIA e o MATERIAL. Responda JSON: ' +
  '{"clareza":0-100,"jargao":["termo técnico usado sem explicar"],' +
  '"lacunas":[{"ponto":"ponto-chave que faltou","conceito":"nome EXATO de um conceito da lista, ou null"}],' +
  '"analogia":"uma analogia simples","reescrita":"a explicação reescrita para um iniciante"}. ' +
  'clareza: quão simples/clara ficou. jargao/lacunas: máx 6 itens, strings curtas. ' +
  'Em lacunas.conceito use SOMENTE nomes da lista de conceitos (ou null). Não invente conceitos.';

// Monta as mensagens da avaliação Feynman (system + o contexto do alvo + a explicação).
export function buildFeynmanMessages(ctx: FeynmanTargetContext, explicacao: string): LlmMessage[] {
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
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user },
  ];
}
