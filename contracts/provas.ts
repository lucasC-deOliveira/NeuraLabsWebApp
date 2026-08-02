import { z } from "zod";

// Contrato das rotas de prova.
//
// Aqui o ganho é sobretudo ESTRUTURAL: o domínio de provas quase não tem regra de
// campo — seus erros (ProvaNotFoundError, ProvaForbiddenError, EmptyAttemptError...)
// são de posse e de estado, não de formato. O que faltava era os tipos declarados
// valerem em runtime: hoje um `acertos: "muitos"` atravessa o controller e só
// quebra lá no Prisma.
//
// O que NÃO entra aqui de propósito: a exigência de ao menos uma resposta na
// tentativa. Essa regra já é cobrada por RecordProvaAttemptUseCase com a mensagem
// do EmptyAttemptError; repeti-la mudaria o erro que o usuário vê, sem ganho.

// Sem `.min(1)` nos títulos e ids: o backend de provas NÃO cobra conteúdo em campo
// nenhum. Exigir aqui apertaria a API em silêncio — recusaria requisição que hoje
// funciona. O contrato garante que o campo veio e que é string; se as telas devem
// exigir conteúdo, isso é decisão de produto, e vira regra em outro PR.
const titulo = z.string();
const id = z.string();

export const TIPOS_QUESTAO_PARSED = ["VERDADEIRO_FALSO", "MULTIPLA_ESCOLHA"] as const;

const parsedAlternativa = z.object({
  letra: z.string(),
  texto: z.string(),
});

// As figuras viajam em base64 no JSON para atravessarem parse → revisão → criação.
// `alternativa` é a letra quando a figura pertence a uma alternativa, ou null
// quando pertence ao enunciado.
const parsedImagem = z.object({
  mimetype: z.string(),
  base64: z.string(),
  alternativa: z.string().nullable(),
});

const conceitoSugerido = z.object({
  nome: z.string(),
  conceitoId: z.string().nullable(),
});

export const parsedQuestao = z.object({
  numero: z.number(),
  enunciado: z.string(),
  tipo: z.enum(TIPOS_QUESTAO_PARSED),
  alternativas: z.array(parsedAlternativa).nullable(),
  gabarito: z.string(),
  explicacao: z.string().nullable(),
  imagens: z.array(parsedImagem).optional(),
  conceitos: z.array(conceitoSugerido).optional(),
});

export const createProvaContract = z.object({
  titulo,
  descricao: z.string().optional(),
  questaoIds: z.array(z.string()),
});
export type CreateProvaBody = z.infer<typeof createProvaContract>;

// PATCH parcial: qualquer subconjunto de CreateProvaInput.
export const updateProvaContract = createProvaContract.partial();
export type UpdateProvaBody = z.infer<typeof updateProvaContract>;

export const createProvaFromParsedContract = z.object({
  titulo,
  descricao: z.string().optional(),
  questoes: z.array(parsedQuestao),
  // Quando presente, as questões também entram neste grafo de conhecimento.
  grafoId: z.string().optional(),
});
export type CreateProvaFromParsedBody = z.infer<typeof createProvaFromParsedContract>;

export const suggestConceitosContract = z.object({
  questoes: z.array(parsedQuestao),
});
export type SuggestConceitosBody = z.infer<typeof suggestConceitosContract>;

const answerInput = z.object({
  questaoId: z.string(),
  respostaEscolhida: z.string(),
  acertou: z.boolean(),
  tempoRespostaMs: z.number().nullable(),
});

// O provaId vem da rota (:id), não do corpo.
export const provaAttemptContract = z.object({
  acertos: z.number(),
  total: z.number(),
  tempoTotalMs: z.number(),
  respostas: z.array(answerInput),
});
export type ProvaAttemptBody = z.infer<typeof provaAttemptContract>;

export const createEditalContract = z.object({
  titulo,
  programa: z.string(),
  grafoId: id,
  provaId: z.string().optional(),
  conceitoNodeIds: z.array(z.string()).optional(),
});
export type CreateEditalBody = z.infer<typeof createEditalContract>;

export const linkEditalContract = z.object({
  provaId: id,
  grafoId: id,
});
export type LinkEditalBody = z.infer<typeof linkEditalContract>;
