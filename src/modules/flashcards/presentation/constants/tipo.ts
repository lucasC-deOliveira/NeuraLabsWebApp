// Rótulos de UI (pt-BR) dos tipos de flashcard, na ordem em que aparecem no filtro.
import type { TipoFlashcard } from "../../domain/flashcard.types";

export const TIPO_LABELS: Record<TipoFlashcard, string> = {
  DEFINICAO: "Definicao",
  EXPLICACAO: "Explicacao",
  EXEMPLO: "Exemplo",
  APLICACAO: "Aplicacao",
  CONTRASTE: "Contraste",
  COMPLETAR: "Completar",
  ORDENACAO: "Ordenacao",
  RELACIONAL: "Relacional",
  ERRO_COMUM: "Erro comum",
};

export const TIPO_OPTIONS = Object.keys(TIPO_LABELS) as TipoFlashcard[];
