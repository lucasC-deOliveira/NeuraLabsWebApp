import { z } from "zod";
import type { CreateNodeError, CreateNodeFormValues } from "./create-node-form";

// Validação do formulário de criação de nó, um schema por tipo. Substitui o
// validateCreateNodeForm, que devolvia só o PRIMEIRO código violado — a UI virava
// um toast por vez. Aqui cada campo carrega sua mensagem (pt-BR, voltada ao usuário)
// e o formulário aponta todos os pendentes de uma vez.

export const EMPTY_CREATE_NODE_FORM: CreateNodeFormValues = {
  nome: "",
  descricao: "",
  pergunta: "",
  resposta: "",
  conteudo: "",
  tipoNota: "PERMANENTE",
  subtipo: "",
  fonte: "",
};

const ANY_TEXT = z.string();

const OPTIONAL_FIELDS = {
  nome: ANY_TEXT,
  descricao: ANY_TEXT,
  pergunta: ANY_TEXT,
  resposta: ANY_TEXT,
  conteudo: ANY_TEXT,
  tipoNota: ANY_TEXT,
  subtipo: ANY_TEXT,
  fonte: ANY_TEXT,
};

const required = (message: string): z.ZodString => z.string().trim().min(1, message);

/** Only `nome` matters — the shape used by ASSUNTO/TOPICO/CONCEITO/BARALHO. */
function namedNode(nameMessage: string): z.ZodType<CreateNodeFormValues> {
  return z.object({ ...OPTIONAL_FIELDS, nome: required(nameMessage) });
}

const NOTA_SOURCE_MESSAGE = "Notas de referência exigem a fonte (livro, artigo, vídeo...)";

const notaSchema = z
  .object({
    ...OPTIONAL_FIELDS,
    nome: required("Digite um título para a nota"),
    subtipo: required("Selecione o subtipo da nota"),
    conteudo: required("Digite o texto da nota"),
  })
  // A fonte só é exigida na nota de literatura — regra condicional, por isso
  // superRefine em vez de um campo obrigatório fixo.
  .superRefine((values, ctx) => {
    if (values.tipoNota !== "LITERATURA" || values.fonte.trim()) return;
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fonte"], message: NOTA_SOURCE_MESSAGE });
  });

export const CREATE_NODE_SCHEMAS: Record<string, z.ZodType<CreateNodeFormValues>> = {
  ASSUNTO: namedNode("Digite um nome para o assunto"),
  TOPICO: namedNode("Digite um nome para o tópico"),
  CONCEITO: namedNode("Digite um nome para o conceito"),
  BARALHO: namedNode("Digite um título para o baralho"),
  FLASHCARD: z.object({
    ...OPTIONAL_FIELDS,
    pergunta: required("Digite a pergunta do flashcard"),
    resposta: required("Digite a resposta para o flashcard"),
  }),
  NOTA: notaSchema,
};

const GENERIC_NAMED_NODE = namedNode("Digite um nome");

/**
 * Schema for a node type, falling back to the plain "needs a name" rule — same
 * default the old createNodeErrorMessage applied to types outside its map.
 *
 * @example schemaForNodeType("NOTA").safeParse(form)
 */
export function schemaForNodeType(type: string): z.ZodType<CreateNodeFormValues> {
  return CREATE_NODE_SCHEMAS[type] ?? GENERIC_NAMED_NODE;
}

// Cada campo obrigatório corresponde a um código de erro do domínio, e o use-case
// lança só o PRIMEIRO violado — esta é a ordem que ele sempre usou.
const CODE_BY_FIELD: Array<[keyof CreateNodeFormValues, CreateNodeError]> = [
  ["nome", "missing-name"],
  ["pergunta", "flashcard-missing-question"],
  ["resposta", "flashcard-missing-answer"],
  ["subtipo", "nota-missing-subtype"],
  ["fonte", "nota-missing-source"],
  ["conteudo", "nota-missing-content"],
];

/**
 * Guarda de dominio do create-node, derivada do MESMO schema que o formulário usa —
 * a UI mostra as mensagens, o use-case lança o código. Sem regra duplicada.
 *
 * @example validateCreateNodeForm("NOTA", form) // => "nota-missing-subtype" | null
 */
export function validateCreateNodeForm(type: string, form: CreateNodeFormValues): CreateNodeError | null {
  const result = schemaForNodeType(type).safeParse(form);
  if (result.success) return null;
  const failed = new Set(result.error.issues.map((issue) => issue.path.join(".")));
  return CODE_BY_FIELD.find(([field]) => failed.has(field))?.[1] ?? null;
}
