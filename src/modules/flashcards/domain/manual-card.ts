// Pure builders/validation for the manual flashcard editor. Each card type
// composes its pergunta/resposta from type-specific fields.
import type { TipoFlashcard } from "./flashcard.types";

export type ManualCardType = TipoFlashcard;

export interface ManualCardFields {
  pergunta: string;
  resposta: string;
  frase: string;
  lacuna: string;
  conceitoA: string;
  conceitoB: string;
  explicacaoComp: string;
  temaLista: string;
  itens: string[];
  cenario: string;
  explicacaoApp: string;
  temaErro: string;
  erro: string;
  correto: string;
}

export const EMPTY_MANUAL_FIELDS: ManualCardFields = {
  pergunta: "", resposta: "", frase: "", lacuna: "", conceitoA: "", conceitoB: "",
  explicacaoComp: "", temaLista: "", itens: ["", "", ""], cenario: "", explicacaoApp: "",
  temaErro: "", erro: "", correto: "",
};

export interface CardContent {
  pergunta: string;
  resposta: string;
}

const BUILDERS: Record<ManualCardType, (f: ManualCardFields) => CardContent> = {
  DEFINICAO: (f) => ({ pergunta: f.pergunta.trim() ? `O que é ${f.pergunta.trim()}?` : "", resposta: f.resposta.trim() }),
  EXPLICACAO: (f) => ({ pergunta: f.pergunta.trim(), resposta: f.resposta.trim() }),
  RELACIONAL: (f) => ({ pergunta: f.pergunta.trim(), resposta: f.resposta.trim() }),
  EXEMPLO: (f) => ({ pergunta: f.pergunta.trim() ? `Dê um exemplo de ${f.pergunta.trim()}` : "", resposta: f.resposta.trim() }),
  APLICACAO: (f) => ({ pergunta: f.cenario.trim(), resposta: f.explicacaoApp.trim() }),
  CONTRASTE: (f) => ({
    pergunta: f.conceitoA.trim() && f.conceitoB.trim() ? `Qual a diferença entre ${f.conceitoA} e ${f.conceitoB}?` : "",
    resposta: f.explicacaoComp.trim(),
  }),
  COMPLETAR: (f) => ({ pergunta: f.frase.trim() ? `Complete: ${f.frase}` : "", resposta: f.lacuna.trim() }),
  ORDENACAO: (f) => ({
    pergunta: f.temaLista.trim() ? `Coloque em ordem: ${f.temaLista}` : "",
    resposta: f.itens.filter(Boolean).map((v, i) => `${i + 1}. ${v}`).join("\n"),
  }),
  ERRO_COMUM: (f) => ({
    pergunta: f.temaErro.trim() ? `Qual o erro comum sobre "${f.temaErro}"?` : "",
    resposta: `ERRO: ${f.erro.trim()}\n\nCORRETO: ${f.correto.trim()}`,
  }),
};

/** Composes the card's pergunta/resposta from the type-specific fields. */
export function buildManualCard(tipo: ManualCardType, fields: ManualCardFields): CardContent {
  return BUILDERS[tipo](fields);
}

export interface ManualFormErrors {
  query: boolean;
  response: boolean;
}

const VALIDATORS: Record<ManualCardType, (f: ManualCardFields) => ManualFormErrors> = {
  DEFINICAO: (f) => ({ query: !f.pergunta.trim(), response: !f.resposta.trim() }),
  EXPLICACAO: (f) => ({ query: !f.pergunta.trim(), response: !f.resposta.trim() }),
  EXEMPLO: (f) => ({ query: !f.pergunta.trim(), response: !f.resposta.trim() }),
  RELACIONAL: (f) => ({ query: !f.pergunta.trim(), response: !f.resposta.trim() }),
  APLICACAO: (f) => ({ query: !f.cenario.trim(), response: !f.explicacaoApp.trim() }),
  CONTRASTE: (f) => ({ query: !f.conceitoA.trim() || !f.conceitoB.trim(), response: !f.explicacaoComp.trim() }),
  COMPLETAR: (f) => ({ query: !f.frase.trim(), response: !f.lacuna.trim() }),
  ORDENACAO: (f) => ({ query: !f.temaLista.trim(), response: !f.itens.some((v) => v.trim()) }),
  ERRO_COMUM: (f) => ({ query: !f.temaErro.trim(), response: !f.erro.trim() || !f.correto.trim() }),
};

/** Per-field validity for the current type (true = missing/invalid). */
export function validateManualFields(tipo: ManualCardType, fields: ManualCardFields): ManualFormErrors {
  return VALIDATORS[tipo](fields);
}
