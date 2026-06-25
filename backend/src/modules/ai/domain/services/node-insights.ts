// Post-processing of the LLM's node insights: keep titled insights, normalize the
// category, and accept the suggested (tipoNo, relacao) only when allowed — else
// fall back to a default combo, or drop it. The "allowed" rule lives in the graph
// context, so it is injected.

export const INSIGHT_CATEGORIES = ['Relacionado', 'Aprofundar', 'Conexão', 'Lacuna', 'Aplicação'];
const FALLBACK_CATEGORY = 'Relacionado';
export const MAX_NODE_INSIGHTS = 8;

export interface NodeInsight {
  categoria: string;
  titulo: string;
  descricao: string;
  tipoNo: string;
  relacao: string;
}

export interface RawInsight {
  categoria?: unknown;
  titulo?: unknown;
  descricao?: unknown;
  tipoNo?: unknown;
  relacao?: unknown;
}

export interface InsightCombo {
  tipoNo: string;
  relacao: string;
}

export function selectNodeInsights(
  raw: RawInsight[],
  defaultCombo: InsightCombo | null,
  isAllowed: (tipoNo: string, relacao: string) => boolean,
): NodeInsight[] {
  const out: NodeInsight[] = [];
  for (const i of raw) {
    const insight = toInsight(i, defaultCombo, isAllowed);
    if (insight) out.push(insight);
    if (out.length >= MAX_NODE_INSIGHTS) break;
  }
  return out;
}

function toInsight(
  i: RawInsight,
  defaultCombo: InsightCombo | null,
  isAllowed: (tipoNo: string, relacao: string) => boolean,
): NodeInsight | null {
  const titulo = typeof i?.titulo === 'string' ? i.titulo.trim() : '';
  if (!titulo) return null;
  const combo = resolveCombo(i, defaultCombo, isAllowed);
  if (!combo) return null;
  const descricao = typeof i?.descricao === 'string' ? i.descricao.trim() : '';
  return { categoria: normalizeCategory(i.categoria), titulo, descricao, ...combo };
}

function resolveCombo(
  i: RawInsight,
  defaultCombo: InsightCombo | null,
  isAllowed: (tipoNo: string, relacao: string) => boolean,
): InsightCombo | null {
  const tipoNo = typeof i?.tipoNo === 'string' ? i.tipoNo : '';
  const relacao = typeof i?.relacao === 'string' ? i.relacao : '';
  return isAllowed(tipoNo, relacao) ? { tipoNo, relacao } : defaultCombo;
}

function normalizeCategory(categoria: unknown): string {
  return typeof categoria === 'string' && INSIGHT_CATEGORIES.includes(categoria)
    ? categoria
    : FALLBACK_CATEGORY;
}
