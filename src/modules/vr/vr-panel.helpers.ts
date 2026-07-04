export function dominioColor(d: number): string {
  if (d >= 0.7) return "#22c55e";
  if (d >= 0.4) return "#eab308";
  if (d > 0)    return "#ef4444";
  return "#71717a";
}

export function prioridadeColor(p: number): string {
  if (p >= 7) return "#ef4444";
  if (p >= 4) return "#eab308";
  return "#22c55e";
}

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export const TIPO_NOTA_LABELS: Record<string, string> = {
  LITERATURA: "Ref. literatura", PERMANENTE: "Permanente", ESTRUTURA: "Estrutura",
};

export const SUBTIPO_LABELS: Record<string, string> = {
  DEFINICAO: "Definição", EXPLICACAO: "Explicação", EXEMPLO: "Exemplo",
  COMPARACAO: "Comparação", SINTESE: "Síntese", PREREQUISITO: "Pré-requisito",
  ERRO_COMUM: "Erro comum", APLICACAO: "Aplicação",
};

function noteDateLines(notaMeta: Record<string, string | null>): string[] {
  const criada = formatDate(notaMeta.dataCriacao);
  const mod = formatDate(notaMeta.dataAtualizacao);
  const out: string[] = [];
  if (criada) out.push(`Criada: ${criada}`);
  if (mod && mod !== criada) out.push(`Modif.: ${mod}`);
  return out;
}

export function buildNotaLines(
  notaMeta: Record<string, string | null> | null,
): string[] {
  if (!notaMeta) return [];
  const lines: string[] = [];
  if (notaMeta.tipoNota) lines.push(TIPO_NOTA_LABELS[notaMeta.tipoNota] ?? notaMeta.tipoNota);
  if (notaMeta.subtipo)  lines.push(SUBTIPO_LABELS[notaMeta.subtipo] ?? notaMeta.subtipo);
  if (notaMeta.fonte)    lines.push(`Fonte: ${notaMeta.fonte}`);
  if (notaMeta.slug)     lines.push(notaMeta.slug);
  lines.push(...noteDateLines(notaMeta));
  return lines;
}

export function panelHeight(opts: {
  hasPergunta: boolean;
  hasDeckStats: boolean;
  notaLinesCount: number;
  numRels: number;
}): number {
  const REL_H = 0.042;
  return (
    0.34
    + (opts.hasPergunta   ? 0.036 : 0)
    + (opts.hasDeckStats  ? 0.052 : 0)
    + (opts.notaLinesCount > 0 ? opts.notaLinesCount * 0.022 + 0.018 : 0)
    + Math.min(opts.numRels, 7) * REL_H
  );
}
