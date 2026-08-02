import { z } from "zod";

// Contrato das rotas menores: estudo, Feynman, questões, notas, configurações e TTS.
// Agrupadas num arquivo por serem poucas rotas cada — não por serem o mesmo contexto.

// ---- Estudo ----

// Conjunto fechado, copiado do Value Object Grade (study/domain/value-objects).
// Continua opcional: existe o caminho legado por `acertou`, anterior aos 4 botões.
export const GRADES = ["again", "hard", "good", "easy"] as const;
const grade = z.enum(GRADES).optional();

export const submitReviewContract = z.object({
  flashcardId: z.string(),
  respostaUsuario: z.string().optional(),
  grade,
  // Campos legados, mantidos por compatibilidade com sessões antigas.
  acertou: z.boolean().optional(),
  nivelConfianca: z.number().optional(),
  tempoResposta: z.number().optional(),
  sessaoId: z.string().optional(),
});
export type SubmitReviewBody = z.infer<typeof submitReviewContract>;

const vaultReview = z.object({
  flashcardId: z.string(),
  grade,
  acertou: z.boolean().optional(),
  nivelConfianca: z.number().optional(),
  tempoResposta: z.number().optional(),
  revisadoEm: z.string(),
});

const vaultSession = z.object({
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  revisoes: z.array(vaultReview),
});

export const syncVaultLogContract = z.object({
  sessions: z.array(vaultSession).optional(),
});
export type SyncVaultLogBody = z.infer<typeof syncVaultLogContract>;

// Plano de estudo: tudo opcional, como o controller já declara.
export const savePlanContract = z.object({
  id: z.string().optional(),
  prioridade: z.string().optional(),
  metaTipo: z.string().optional(),
  metaValor: z.number().optional(),
  dataAlvo: z.string().nullable().optional(),
  grafoIds: z.array(z.string()).optional(),
  baralhoIds: z.array(z.string()).optional(),
  provaIds: z.array(z.string()).optional(),
  conceitosExcluidos: z.array(z.string()).optional(),
});
export type SavePlanBody = z.infer<typeof savePlanContract>;

// ---- Feynman ----
// Tudo opcional de propósito. O controller TOLERA lixo: parseFeynmanAngulo cai em
// 'SIMPLES' quando o ângulo não é conhecido, e toSessionExplanations descarta os
// itens sem texto ou sem clareza. Um contrato estrito recusaria o que hoje é
// silenciosamente filtrado, mudando o comportamento.

export const feynmanGradeContract = z.object({
  alvoTipo: z.string().optional(),
  alvoId: z.string().optional(),
  texto: z.string().optional(),
  angulo: z.string().optional(),
});
export type FeynmanGradeBody = z.infer<typeof feynmanGradeContract>;

export const feynmanAttemptContract = z.object({
  alvoTipo: z.string().optional(),
  alvoId: z.string().optional(),
  texto: z.string().optional(),
  clareza: z.number().optional(),
  lacunas: z.unknown().optional(),
  jargao: z.unknown().optional(),
});
export type FeynmanAttemptBody = z.infer<typeof feynmanAttemptContract>;

const feynmanSessionItem = z.object({
  angulo: z.string().optional(),
  texto: z.string().optional(),
  clareza: z.number().optional(),
  lacunas: z.unknown().optional(),
  jargao: z.unknown().optional(),
});

export const feynmanSessionContract = z.object({
  alvoTipo: z.string().optional(),
  alvoId: z.string().optional(),
  explicacoes: z.array(feynmanSessionItem).optional(),
});
export type FeynmanSessionBody = z.infer<typeof feynmanSessionContract>;

// ---- Questões ----

export const TIPOS_QUESTAO = ["VERDADEIRO_FALSO", "MULTIPLA_ESCOLHA"] as const;

const alternativaMultipla = z.object({
  letra: z.string(),
  texto: z.string(),
});

export const createQuestaoContract = z.object({
  tipo: z.enum(TIPOS_QUESTAO),
  enunciado: z.string(),
  alternativas: z.array(alternativaMultipla).optional(),
  gabarito: z.string(),
  explicacao: z.string().optional(),
  conceitoId: z.string().nullable().optional(),
});
export type CreateQuestaoBody = z.infer<typeof createQuestaoContract>;

export const updateQuestaoContract = createQuestaoContract.partial();
export type UpdateQuestaoBody = z.infer<typeof updateQuestaoContract>;

// ---- Notas ----

export const createNotaContract = z.object({
  titulo: z.string(),
  conteudo: z.string(),
  subtipo: z.string().nullable().optional(),
  tipoNota: z.string().optional(),
});
export type CreateNotaBody = z.infer<typeof createNotaContract>;

// ---- Configurações ----

export const configAiContract = z.object({
  apiKey: z.string(),
  baseUrl: z.string(),
  modelo: z.string(),
});
export type ConfigAiBody = z.infer<typeof configAiContract>;

// ---- TTS ----

export const synthesizeContract = z.object({
  text: z.string(),
  voice: z.string().optional(),
  rate: z.number().optional(),
});
export type SynthesizeBody = z.infer<typeof synthesizeContract>;
