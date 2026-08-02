import { z } from "zod";

// Contrato das rotas de grafo. Mensagens em pt-BR: o servidor as devolve no 400 e
// elas chegam ao usuário dentro do campo do formulário.
//
// Cobre as rotas de corpo plano. As de forma variável por tipo (criação/edição de
// nó, import e sync do vault) ficam de fora — têm união discriminada e vêm depois.

export const TIPOS_NODE = [
  "ASSUNTO",
  "TOPICO",
  "CONCEITO",
  "FLASHCARD",
  "NOTA",
  "TEXTO_BRUTO",
  "BARALHO",
  "GRAFO_REF",
  "QUESTION",
  "PROVA",
] as const;

export const tipoNode = z.enum(TIPOS_NODE);

const nomeObrigatorio = z.string().trim().min(1, "Informe o nome");
const id = z.string().trim().min(1, "Informe o identificador");
const tipoRelacao = z.string().trim().min(1, "Informe o tipo de relação");

// Força da relação. A faixa NÃO é 0..1: o sistema já trata 0 < peso <= 2 em dois
// lugares independentes — vault-sync.ts (backend) e graph-json-import.ts (frontend),
// que rejeita fora disso na importação. O contrato copia a regra que existe.
const peso = z
  .number()
  .gt(0, "O peso deve ser maior que 0 e no máximo 2")
  .max(2, "O peso deve ser maior que 0 e no máximo 2");

export const createGraphContract = z.object({
  nome: z.string().trim().min(1, "Informe o nome do grafo"),
  descricao: z.string().optional(),
});
export type CreateGraphBody = z.infer<typeof createGraphContract>;

export const renameGraphContract = z.object({
  nome: z.string().trim().min(1, "Informe o nome do grafo"),
});
export type RenameGraphBody = z.infer<typeof renameGraphContract>;

// O estado visual é opaco para a API — quem o interpreta é o frontend do grafo.
export const graphVisualContract = z.object({
  state: z.unknown(),
});
export type GraphVisualBody = z.infer<typeof graphVisualContract>;

export const composeGraphContract = z.object({
  tipo: z.string().trim().optional(),
  id: z.string().trim().optional(),
});
export type ComposeGraphBody = z.infer<typeof composeGraphContract>;

export const linkNodeContract = z.object({
  tipoNode,
  entityId: id,
});
export type LinkNodeBody = z.infer<typeof linkNodeContract>;

// ATENÇÃO: esta rota NÃO segue as mesmas regras do módulo baralhos.
// `normalizeDeckCreation` (graph/domain/services/deck-creation.ts) exige título não
// vazio mas NÃO tem teto de 120, e limita a 1000 flashcards — coisa que o módulo
// baralhos não faz. O contrato copia as regras DESTA rota; unificar as duas é uma
// decisão de produto, não algo para embutir num contrato.
export const MAX_DECK_FLASHCARDS = 1000;

export const createGraphBaralhoContract = z.object({
  titulo: z.string().trim().min(1, "Informe o título do baralho"),
  flashcardIds: z
    .array(z.string())
    .max(MAX_DECK_FLASHCARDS, `Um baralho aceita no máximo ${MAX_DECK_FLASHCARDS} flashcards`)
    .default([]),
});
export type CreateGraphBaralhoBody = z.infer<typeof createGraphBaralhoContract>;

export const addProvaToGraphContract = z.object({
  provaId: id,
});
export type AddProvaToGraphBody = z.infer<typeof addProvaToGraphContract>;

export const createEdgeContract = z.object({
  sourceNodeId: id,
  targetNodeId: id,
  tipoRelacao,
  peso: peso.optional(),
});
export type CreateEdgeBody = z.infer<typeof createEdgeContract>;

export const updateEdgeContract = z.object({
  tipoRelacao: tipoRelacao.optional(),
  peso: peso.optional(),
});
export type UpdateEdgeBody = z.infer<typeof updateEdgeContract>;

export const graphPositionsContract = z.object({
  positions: z.record(z.object({ x: z.number(), y: z.number() })),
});
export type GraphPositionsBody = z.infer<typeof graphPositionsContract>;

export const createSubgraphContract = z.object({
  nome: nomeObrigatorio,
  descricao: z.string().optional(),
  tipoRelacao,
  posX: z.number().optional(),
  posY: z.number().optional(),
});
export type CreateSubgraphBody = z.infer<typeof createSubgraphContract>;

export const extractSubgraphContract = z.object({
  nodeIds: z.array(z.string()).min(1, "Selecione ao menos um nó"),
  nome: nomeObrigatorio,
  tipoRelacao,
});
export type ExtractSubgraphBody = z.infer<typeof extractSubgraphContract>;
