import { z } from "zod";
import { EMPTY_MANUAL_FIELDS, type ManualCardFields, type ManualCardType } from "../manual-card";

// Validação do editor manual de flashcard. Cada tipo de card exige um conjunto
// diferente de campos, então há um schema por tipo — a UI escolhe o resolver pelo
// tipo selecionado. Regra pura no domínio; mensagens voltadas ao usuário (pt-BR).
//
// O formulário trabalha com `itens: {value}[]` (exigência do useFieldArray, que não
// aceita array de primitivos); `toManualCardFields` converte de volta para o
// `string[]` do domínio antes de montar o card.

type TextField = keyof Omit<ManualCardFields, "itens">;

const ALL_TEXT_OPTIONAL = Object.fromEntries(
  (Object.keys(EMPTY_MANUAL_FIELDS) as (keyof ManualCardFields)[])
    .filter((field): field is TextField => field !== "itens")
    .map((field) => [field, z.string()]),
) as Record<TextField, z.ZodString>;

const ITENS_ANY = z.array(z.object({ value: z.string() }));

const ITENS_REQUIRED = ITENS_ANY.refine(
  (itens) => itens.some((item) => item.value.trim()),
  "Informe ao menos um item da ordem",
);

/**
 * Builds the schema for one card type: only the listed fields are required, every
 * other field stays free-form so switching types never blocks on a stale value.
 *
 * @example requiring({ pergunta: "Informe o termo" })
 */
type ManualShape = Record<TextField, z.ZodString> & { itens: typeof ITENS_ANY };

function requiring(rules: Partial<Record<TextField, string>>): z.ZodObject<ManualShape> {
  const shape: ManualShape = { ...ALL_TEXT_OPTIONAL, itens: ITENS_ANY };
  for (const [field, message] of Object.entries(rules)) {
    shape[field as TextField] = z.string().trim().min(1, message);
  }
  return z.object(shape);
}

export const MANUAL_CARD_SCHEMAS: Record<ManualCardType, z.ZodType<ManualCardFormValues>> = {
  DEFINICAO: requiring({ pergunta: "Informe o termo ou conceito", resposta: "Informe a definição" }),
  EXPLICACAO: requiring({ pergunta: "Informe a pergunta ou tópico", resposta: "Informe a explicação" }),
  EXEMPLO: requiring({ pergunta: "Informe o conceito a exemplificar", resposta: "Informe o exemplo" }),
  RELACIONAL: requiring({ pergunta: "Informe os termos a relacionar", resposta: "Informe as relações" }),
  APLICACAO: requiring({ cenario: "Informe o cenário ou problema", explicacaoApp: "Informe como aplicar" }),
  CONTRASTE: requiring({
    conceitoA: "Informe o primeiro conceito",
    conceitoB: "Informe o segundo conceito",
    explicacaoComp: "Informe as diferenças",
  }),
  COMPLETAR: requiring({ frase: "Informe a frase com a lacuna", lacuna: "Informe a resposta da lacuna" }),
  ORDENACAO: requiring({ temaLista: "Informe o que ordenar" }).extend({ itens: ITENS_REQUIRED }),
  ERRO_COMUM: requiring({
    temaErro: "Informe o tema",
    erro: "Informe o erro comum",
    correto: "Informe a explicação correta",
  }),
};

export type ManualCardFormValues = Omit<ManualCardFields, "itens"> & { itens: { value: string }[] };

export const EMPTY_MANUAL_FORM_VALUES: ManualCardFormValues = {
  ...EMPTY_MANUAL_FIELDS,
  itens: EMPTY_MANUAL_FIELDS.itens.map((value) => ({ value })),
};

/**
 * What the form holds mid-typing: the live snapshot the preview reads is only
 * partially filled, so every key is optional here.
 */
export type ManualCardFormDraft =
  Partial<Record<TextField, string>> & { itens?: ({ value?: string } | undefined)[] };

function filledTextFields(draft: ManualCardFormDraft): Partial<Record<TextField, string>> {
  const entries = Object.entries(draft).filter(([key, value]) => key !== "itens" && value !== undefined);
  return Object.fromEntries(entries) as Partial<Record<TextField, string>>;
}

/**
 * Converts the form model back to the domain model consumed by buildManualCard,
 * filling anything the user has not typed yet with the empty default.
 *
 * @example toManualCardFields({ pergunta: "Soberania", itens: [{ value: "a" }] })
 */
export function toManualCardFields(draft: ManualCardFormDraft): ManualCardFields {
  return {
    ...EMPTY_MANUAL_FIELDS,
    ...filledTextFields(draft),
    itens: (draft.itens ?? EMPTY_MANUAL_FIELDS.itens.map(() => ({ value: "" }))).map((item) => item?.value ?? ""),
  };
}
