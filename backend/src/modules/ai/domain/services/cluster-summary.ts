// Normalizes the LLM's community/cluster summary response to safe defaults.

export interface ClusterSummary {
  titulo: string;
  resumo: string;
}

const DEFAULT_TITULO = 'Resumo do cluster';

export function parseClusterSummary(parsed: unknown): ClusterSummary {
  const obj = (parsed ?? {}) as { titulo?: unknown; resumo?: unknown };
  return {
    titulo: typeof obj.titulo === 'string' ? obj.titulo : DEFAULT_TITULO,
    resumo: typeof obj.resumo === 'string' ? obj.resumo : '',
  };
}
