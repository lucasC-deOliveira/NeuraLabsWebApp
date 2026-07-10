// Builds the existing-node index used by cascading-write features: a map of
// "tipo|nomeLowercase" → referenciaId plus a prompt fragment listing the names
// so the model reuses them instead of creating duplicates. Pure logic.

import { nodeNameKey } from './node-name-key';

export interface NamedNode {
  id: string;
  nome: string;
}

export interface GraphNameIndex {
  nameIndex: Map<string, string>;
  existingContext: string;
}

const CONTEXT_PREFIX =
  '\n\nNÓS JÁ NO GRAFO (não duplique — reutilize esses nomes exatos se relevante):\n';
const CONCEITO_LIST_CAP = 50;

export function buildNameIndex(
  assuntos: NamedNode[],
  topicos: NamedNode[],
  conceitos: NamedNode[],
): GraphNameIndex {
  const nameIndex = new Map<string, string>();
  const lines: string[] = [];
  addGroup(nameIndex, lines, 'ASSUNTO', 'ASSUNTOs existentes', assuntos);
  addGroup(nameIndex, lines, 'TOPICO', 'TÓPICOs existentes', topicos);
  addGroup(nameIndex, lines, 'CONCEITO', 'CONCEITOs existentes', conceitos, CONCEITO_LIST_CAP);
  const existingContext = lines.length ? CONTEXT_PREFIX + lines.join('\n') : '';
  return { nameIndex, existingContext };
}

function addGroup(
  nameIndex: Map<string, string>,
  lines: string[],
  tipo: string,
  label: string,
  nodes: NamedNode[],
  cap?: number,
): void {
  if (!nodes.length) return;
  for (const n of nodes) nameIndex.set(nodeNameKey(tipo, n.nome), n.id);
  const listed = cap ? nodes.slice(0, cap) : nodes;
  lines.push(`${label}: ${listed.map((n) => `"${n.nome}"`).join(', ')}`);
}
