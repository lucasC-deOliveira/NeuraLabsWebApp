// Builds the grouped-by-subject context string for the completeness assessment:
// each ASSUNTO with its directly-linked (PERTENCE_A) topics/concepts, plus a
// trailing list of orphans. Pure logic over the loaded graph data.

export interface NamedEntity {
  id: string;
  nome: string;
}

export interface NcNode {
  id: string;
  tipoNode: string;
  referenciaId: string;
}

export interface PertenceEdge {
  nodeOrigemId: string | null;
  nodeDestinoId: string | null;
}

export interface AssessmentContextData {
  assuntos: NamedEntity[];
  topicos: NamedEntity[];
  conceitos: NamedEntity[];
  ncNodes: NcNode[];
  pertenceEdges: PertenceEdge[];
}

interface Children {
  topicos: string[];
  conceitos: string[];
}

export function buildAssessmentContext(data: AssessmentContextData): string {
  const children = groupChildren(data);
  const lines = assuntoLines(data, children);
  appendOrphans(lines, data.topicos, data.conceitos);
  return lines.join('\n');
}

function assuntoNcId(assuntoId: string, ncNodes: NcNode[]): string | undefined {
  return ncNodes.find((n) => n.tipoNode === 'ASSUNTO' && n.referenciaId === assuntoId)?.id;
}

function groupChildren(data: AssessmentContextData): Map<string, Children> {
  const byNcId = new Map(data.ncNodes.map((n) => [n.id, n]));
  const topicoNome = new Map(data.topicos.map((t) => [t.id, t.nome]));
  const conceitoNome = new Map(data.conceitos.map((c) => [c.id, c.nome]));
  const children = new Map<string, Children>();
  for (const a of data.assuntos) {
    const ncId = assuntoNcId(a.id, data.ncNodes);
    if (ncId) children.set(ncId, { topicos: [], conceitos: [] });
  }
  for (const e of data.pertenceEdges) addChild(e, children, byNcId, topicoNome, conceitoNome);
  return children;
}

function addChild(
  e: PertenceEdge,
  children: Map<string, Children>,
  byNcId: Map<string, NcNode>,
  topicoNome: Map<string, string>,
  conceitoNome: Map<string, string>,
): void {
  if (!e.nodeOrigemId || !e.nodeDestinoId) return;
  const src = byNcId.get(e.nodeOrigemId);
  const bucket = children.get(e.nodeDestinoId);
  if (!src || !bucket) return;
  if (src.tipoNode === 'TOPICO')
    bucket.topicos.push(topicoNome.get(src.referenciaId) ?? src.referenciaId);
  if (src.tipoNode === 'CONCEITO')
    bucket.conceitos.push(conceitoNome.get(src.referenciaId) ?? src.referenciaId);
}

function assuntoLines(data: AssessmentContextData, children: Map<string, Children>): string[] {
  const lines: string[] = [];
  for (const a of data.assuntos) {
    const ncId = assuntoNcId(a.id, data.ncNodes);
    const bucket = ncId ? children.get(ncId) : undefined;
    lines.push(`ASSUNTO: "${a.nome}"`);
    if (bucket?.topicos.length) lines.push(`  Tópicos: ${bucket.topicos.join(', ')}`);
    if (bucket?.conceitos.length) lines.push(`  Conceitos: ${bucket.conceitos.join(', ')}`);
  }
  return lines;
}

function appendOrphans(lines: string[], topicos: NamedEntity[], conceitos: NamedEntity[]): void {
  const joined = lines.join('');
  const orphanTopicos = topicos.filter((t) => !joined.includes(t.nome));
  const orphanConceitos = conceitos.filter((c) => !joined.includes(c.nome));
  if (!orphanTopicos.length && !orphanConceitos.length) return;
  lines.push('Outros (sem assunto pai):');
  if (orphanTopicos.length) lines.push(`  Tópicos: ${orphanTopicos.map((t) => t.nome).join(', ')}`);
  if (orphanConceitos.length)
    lines.push(`  Conceitos: ${orphanConceitos.map((c) => c.nome).join(', ')}`);
}
