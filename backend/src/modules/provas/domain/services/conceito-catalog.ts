import type { CatalogoConceitos, ConceitoConhecido } from '../prova';

// Grounds the question→concept classification in the user's existing graph:
// a lowercased CONCEITO name → id map (to resolve suggestions back to node ids)
// and a prompt fragment listing existing names (so the model reuses them instead
// of duplicating). Mirrors the ai module's name-index, kept inside provas to
// respect the bounded-context boundary. Pure.

const CATALOG_PREFIX =
  'NÓS JÁ NO GRAFO (reutilize estes nomes exatos quando fizer sentido, não duplique):\n';

/** Lowercased CONCEITO name → node id, to resolve suggested names to existing nodes. */
export function conceitoNameIndex(catalogo: CatalogoConceitos): Map<string, string> {
  return new Map(catalogo.conceitos.map((c) => [c.nome.toLowerCase(), c.id]));
}

/** Prompt fragment listing the existing nodes by level; empty when the graph is empty. */
export function catalogoPromptFragment(catalogo: CatalogoConceitos): string {
  const lines = [
    listLine('ASSUNTOs', catalogo.assuntos),
    listLine('TÓPICOs', catalogo.topicos),
    listLine('CONCEITOs', catalogo.conceitos),
  ].filter((line) => line !== '');
  return lines.length ? CATALOG_PREFIX + lines.join('\n') : '';
}

function listLine(label: string, nodes: ConceitoConhecido[]): string {
  if (nodes.length === 0) return '';
  return `${label}: ${nodes.map((n) => `"${n.nome}"`).join(', ')}`;
}
