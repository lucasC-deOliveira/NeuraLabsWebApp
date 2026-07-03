// Regras puras do formulário de questão (validação + reindexação de alternativas).
import type { AlternativaMultipla, TipoQuestao } from "../questao.types";

export const LETRAS = ["A", "B", "C", "D", "E"];

/** Reatribui as letras (A, B, C…) na ordem após adicionar/remover alternativas. */
export function reindexAlternativas(alts: AlternativaMultipla[]): AlternativaMultipla[] {
  return alts.map((a, i) => ({ ...a, letra: LETRAS[i] }));
}

/**
 * Valida os campos obrigatórios da questão; devolve a mensagem de erro ou null.
 * @example validateQuestao("MULTIPLA_ESCOLHA", "Enunciado?", alts)
 */
export function validateQuestao(tipo: TipoQuestao, enunciado: string, alternativas: AlternativaMultipla[]): string | null {
  if (!enunciado.trim()) return "Informe o enunciado.";
  if (tipo === "MULTIPLA_ESCOLHA" && alternativas.some((a) => !a.texto.trim())) {
    return "Preencha todas as alternativas.";
  }
  return null;
}
