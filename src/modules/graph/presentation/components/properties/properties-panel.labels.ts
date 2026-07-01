// Display labels + formatting for the properties panel (presentation-only, pt-BR).

export const SUBTIPO_LABELS: Record<string, string> = {
  DEFINICAO: "Definição",
  EXPLICACAO: "Explicação",
  EXEMPLO: "Exemplo",
  COMPARACAO: "Comparação",
  SINTESE: "Síntese",
  PREREQUISITO: "Pré-requisito",
  ERRO_COMUM: "Erro comum",
  APLICACAO: "Aplicação",
};

export const TIPO_NOTA_LABELS: Record<string, string> = {
  LITERATURA: "Nota de referência",
  PERMANENTE: "Nota permanente",
  ESTRUTURA: "Nota de estrutura",
};

export function formatPanelDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Mastery bar color by domain level (green/yellow/red/gray). */
export function domainColor(dominio: number): string {
  if (dominio >= 0.7) return "#22c55e";
  if (dominio >= 0.4) return "#eab308";
  if (dominio > 0) return "#ef4444";
  return "#71717a";
}
