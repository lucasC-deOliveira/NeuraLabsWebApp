// Splits a graph-chat completion into the Markdown answer and the referenced
// nodes. The model appends a {"referencedNodeIds":[...]} JSON line; this strips
// it from the answer and resolves the ids to real graph nodes.

export interface ChatNode {
  id: string;
  nome: string;
  tipo: string;
}

export interface ChatAnswer {
  answer: string;
  referencedNodes: ChatNode[];
}

export function extractChatAnswer(content: string, allNodes: ChatNode[]): ChatAnswer {
  if (!content) return { answer: '', referencedNodes: [] };
  const { answer, referencedIds } = splitAnswer(content);
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const referencedNodes = referencedIds
    .map((id) => byId.get(id))
    .filter((n): n is ChatNode => !!n)
    .map((n) => ({ id: n.id, nome: n.nome, tipo: n.tipo }));
  return { answer, referencedNodes };
}

function splitAnswer(content: string): { answer: string; referencedIds: string[] } {
  const match = content.match(/\{"referencedNodeIds"\s*:\s*\[[\s\S]*?\]\s*\}/);
  if (!match) return { answer: content, referencedIds: [] };
  const answer = content.slice(0, content.lastIndexOf(match[0])).trim();
  return { answer, referencedIds: parseIds(match[0]) };
}

function parseIds(json: string): string[] {
  try {
    const ids: unknown = (JSON.parse(json) as { referencedNodeIds?: unknown }).referencedNodeIds;
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
