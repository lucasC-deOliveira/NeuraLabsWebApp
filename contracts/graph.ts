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

// ---- Nó: criação e edição ----
// A regra vem de assertCreatableNode (graph/domain/services/node-creation.ts) e as
// mensagens do graph-domain-exception.filter, para o usuário ver o mesmo texto.

/** Nem todo tipo de nó pode ser CRIADO por esta rota — GRAFO_REF, QUESTION e PROVA não. */
export const CREATABLE_NODE_TYPES = [
  "FLASHCARD",
  "NOTA",
  "TEXTO_BRUTO",
  "ASSUNTO",
  "TOPICO",
  "CONCEITO",
  "BARALHO",
] as const;

export const NOTA_SUBTIPOS = [
  "DEFINICAO",
  "EXPLICACAO",
  "EXEMPLO",
  "COMPARACAO",
  "SINTESE",
  "PREREQUISITO",
  "ERRO_COMUM",
  "APLICACAO",
] as const;

// Campos do nó. Quais valem depende do tipo; o adapter aplica os defaults de
// persistência para os que ficarem indefinidos. nivelDominio fica SEM faixa de
// propósito: o backend não cobra nenhuma, e inventar uma aqui recusaria dado válido.
const nodeFields = {
  nome: z.string().optional(),
  descricao: z.string().nullable().optional(),
  pergunta: z.string().optional(),
  resposta: z.string().optional(),
  titulo: z.string().optional(),
  conteudo: z.string().optional(),
  tipoNota: z.string().optional(),
  subtipo: z.string().optional(),
  fonte: z.string().nullable().optional(),
  texto: z.string().optional(),
  posicaoX: z.number().nullable().optional(),
  posicaoY: z.number().nullable().optional(),
  nivelDominio: z.number().optional(),
};

type NodePayload = { tipoNode: string; titulo?: string; subtipo?: string; tipoNota?: string; texto?: string };

/** Invariantes de NOTA: título, subtipo válido e fonte quando for de literatura. */
function checkNota(node: NodePayload, ctx: z.RefinementCtx): void {
  if (!(node.titulo ?? "").trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["titulo"], message: "O título da nota é obrigatório" });
  }
  if (!node.subtipo || !NOTA_SUBTIPOS.includes(node.subtipo as (typeof NOTA_SUBTIPOS)[number])) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["subtipo"], message: "Selecione o subtipo da nota" });
  }
}

function checkCreatableNode(node: NodePayload & { fonte?: string | null }, ctx: z.RefinementCtx): void {
  if (node.tipoNode === "NOTA") {
    checkNota(node, ctx);
    // O default do backend é PERMANENTE quando tipoNota vem vazio.
    if ((node.tipoNota ?? "PERMANENTE") === "LITERATURA" && !node.fonte?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fonte"], message: "Notas de literatura exigem a fonte" });
    }
    return;
  }
  if (node.tipoNode === "TEXTO_BRUTO" && !node.texto?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["texto"], message: "O texto original é obrigatório" });
  }
}

export const createNodeContract = z
  .object({ tipoNode: z.enum(CREATABLE_NODE_TYPES), ...nodeFields })
  .superRefine(checkCreatableNode);
export type CreateNodeBody = z.infer<typeof createNodeContract>;

// A edição não repassa por assertCreatableNode — só o tipo é obrigatório, e ela
// alcança tipos que não podem ser criados por aqui (GRAFO_REF, PROVA...).
export const updateNodeContract = z.object({ tipoNode, ...nodeFields });
export type UpdateNodeBody = z.infer<typeof updateNodeContract>;

// ---- Import e sync ----

// O parsing item a item vive no adapter de import, que aceita mais de um formato.
// Aqui só garantimos que vieram duas listas, em vez de estourar lá dentro.
export const importGraphContract = z.object({
  nodes: z.array(z.unknown()),
  edges: z.array(z.unknown()),
});
export type ImportGraphBody = z.infer<typeof importGraphContract>;

const vaultNode = z.object({ ref: z.string().min(1), tipo: z.string().min(1), ...nodeFields });

// O peso NÃO tem faixa aqui: o vault-sync usa clampPeso, que coage para 1 fora de
// (0, 2] em vez de recusar. Rejeitar quebraria o Push de arquivo editado à mão.
const vaultEdge = z.object({
  origem: z.string().min(1),
  destino: z.string().min(1),
  relacao: z.string().min(1),
  peso: z.number().optional(),
});

export const vaultSyncContract = z.object({
  nodes: z.array(vaultNode),
  edges: z.array(vaultEdge),
});
export type VaultSyncBody = z.infer<typeof vaultSyncContract>;
