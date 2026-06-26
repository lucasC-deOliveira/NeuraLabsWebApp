// Builds the prompt context for a cluster summary: one labeled line per node,
// with type-specific body truncation. Pure presentation logic over loaded nodes.

export interface ClusterNode {
  tipo: string;
  nome: string;
  corpo: string | null;
}

interface TypeFormat {
  label: string;
  maxLen: number;
  alwaysBody: boolean;
}

const FORMATS: Record<string, TypeFormat> = {
  ASSUNTO: { label: 'ASSUNTO', maxLen: 150, alwaysBody: false },
  TOPICO: { label: 'TÓPICO', maxLen: 150, alwaysBody: false },
  CONCEITO: { label: 'CONCEITO', maxLen: 200, alwaysBody: false },
  NOTA: { label: 'NOTA', maxLen: 400, alwaysBody: true },
};

export function buildClusterContext(nodes: ClusterNode[]): string {
  return nodes.map(lineFor).join('\n\n');
}

function lineFor(node: ClusterNode): string {
  const fmt = FORMATS[node.tipo] ?? { label: node.tipo, maxLen: 200, alwaysBody: false };
  const nome = node.tipo === 'NOTA' ? node.nome || 'Nota' : node.nome;
  const body = node.corpo ? node.corpo.slice(0, fmt.maxLen) : '';
  if (fmt.alwaysBody) return `[${fmt.label}] ${nome}: ${body}`;
  return `[${fmt.label}] ${nome}${body ? ': ' + body : ''}`;
}
