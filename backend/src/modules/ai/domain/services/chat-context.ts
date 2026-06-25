// Builds the graph-chat prompt context: one labeled line per node, prefixed with
// its id (so the model can reference it) and with type-specific body truncation.

export interface ChatContextNode {
  id: string;
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
  TOPICO: { label: 'TÓPICO', maxLen: 200, alwaysBody: false },
  CONCEITO: { label: 'CONCEITO', maxLen: 300, alwaysBody: false },
  NOTA: { label: 'NOTA', maxLen: 500, alwaysBody: true },
};

export function buildChatContext(nodes: ChatContextNode[]): string {
  return nodes.map(lineFor).join('\n\n');
}

function lineFor(node: ChatContextNode): string {
  const fmt = FORMATS[node.tipo] ?? { label: node.tipo, maxLen: 200, alwaysBody: false };
  const nome = node.tipo === 'NOTA' ? node.nome || 'Nota' : node.nome;
  const body = node.corpo ? node.corpo.slice(0, fmt.maxLen) : '';
  const head = `[${fmt.label}:${node.id}] ${nome}`;
  if (fmt.alwaysBody) return `${head}: ${body}`;
  return `${head}${body ? ': ' + body : ''}`;
}
