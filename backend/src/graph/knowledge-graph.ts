import type { PrismaClient } from '@prisma/client';

export type GraphNode = {
  id: string;
  label: string;
  type: 'ASSUNTO' | 'TOPICO' | 'CONCEITO' | 'FLASHCARD' | 'NOTA' | 'TEXTO_BRUTO' | 'BARALHO';
  nivelDominio: number;
  prioridadeRevisao: number;
  parentId?: string;
  pergunta?: string;
};

export type GraphEdge = { source: string; target: string; type: string; peso: number };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function resolveLabel(
  tipoNode: string,
  refId: string,
  subjects: any[],
  topicos: any[],
  conceitos: any[],
  notas: any[],
  flashcards: any[],
  textosBrutos: any[],
  baralhos: any[],
): string {
  const trunc = (s: string) => (s.length > 60 ? `${s.slice(0, 60)}…` : s);
  switch (tipoNode) {
    case 'ASSUNTO':
      return subjects.find((s) => s.id === refId)?.nome ?? refId;
    case 'TOPICO':
      return topicos.find((t) => t.id === refId)?.nome ?? refId;
    case 'CONCEITO':
      return conceitos.find((c) => c.id === refId)?.nome ?? refId;
    case 'FLASHCARD': {
      const fc = flashcards.find((f) => f.id === refId);
      return fc?.pergunta ? trunc(fc.pergunta) : refId;
    }
    case 'NOTA': {
      const n = notas.find((x) => x.id === refId);
      if (n?.titulo && n.titulo !== 'Sem título') return n.titulo;
      return n?.conteudo ? trunc(n.conteudo) : refId;
    }
    case 'TEXTO_BRUTO': {
      const tb = textosBrutos.find((x) => x.id === refId);
      if (tb?.titulo && tb.titulo !== 'Texto sem título') return tb.titulo;
      return tb?.texto ? trunc(tb.texto) : refId;
    }
    case 'BARALHO':
      return baralhos.find((x) => x.id === refId)?.titulo ?? refId;
    default:
      return refId;
  }
}

// Relações que carregam maestria (origem→destino) para propagar o domínio.
const DOMAIN_CARRYING = new Set<string>([
  'TESTA', 'HERDA',
  'DEFINE', 'EXPLICA', 'APROFUNDA', 'EXEMPLIFICA', 'CONTRASTA', 'SINTETIZA', 'ALERTA_ERRO',
  'PERTENCE_A', 'FUNDAMENTA', 'APLICADO_EM',
]);
const DOMAIN_TARGET_TYPES = new Set(['ASSUNTO', 'TOPICO', 'CONCEITO', 'NOTA']);

export function applyDomainFromFlashcards(
  nodes: GraphNode[],
  edges: GraphEdge[],
  flashcardMastery: Map<string, number>,
): void {
  const adj = new Map<string, Array<{ to: string; peso: number }>>();
  for (const e of edges) {
    if (!DOMAIN_CARRYING.has(e.type)) continue;
    const peso = typeof e.peso === 'number' && e.peso > 0 ? e.peso : 1;
    (adj.get(e.source) ?? adj.set(e.source, []).get(e.source)!).push({ to: e.target, peso });
  }
  const acc = new Map<string, { weighted: number; weight: number }>();
  for (const [fcId, mastery] of flashcardMastery) {
    const strength = new Map<string, number>([[fcId, 1]]);
    const queue = [fcId];
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const s = strength.get(cur)!;
      for (const { to, peso } of adj.get(cur) ?? []) {
        if (strength.has(to)) continue;
        const sNext = s * peso;
        strength.set(to, sNext);
        queue.push(to);
        const a = acc.get(to) ?? { weighted: 0, weight: 0 };
        a.weighted += mastery * sNext;
        a.weight += sNext;
        acc.set(to, a);
      }
    }
  }
  for (const node of nodes) {
    if (node.type === 'FLASHCARD') {
      node.nivelDominio = flashcardMastery.get(node.id) ?? node.nivelDominio;
      continue;
    }
    if (!DOMAIN_TARGET_TYPES.has(node.type)) continue;
    const a = acc.get(node.id);
    node.nivelDominio = a && a.weight > 0 ? clamp01(a.weighted / a.weight) : 0;
  }
}

// Monta o grafo (nós + arestas) de um grafo específico. SRS (aprendizado) entra
// no cálculo do domínio.
export async function buildKnowledgeGraph(
  prisma: PrismaClient,
  userId: string,
  grafoId: string,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const [graphNodes, graphEdges] = await Promise.all([
    prisma.nodeConhecimento.findMany({ where: { grafoId, usuarioId: userId } }),
    prisma.conhecimentoAresta.findMany({ where: { grafoId } }),
  ]);

  const byType: Record<string, Set<string>> = {};
  for (const n of graphNodes) (byType[n.tipoNode] ??= new Set()).add(n.referenciaId);
  const ids = (t: string) => (byType[t] ? [...byType[t]!] : ['__none__']);

  const [subjects, topicos, conceitos, notas, flashcards, textosBrutos, baralhos] = await Promise.all([
    prisma.assunto.findMany({ where: { id: { in: ids('ASSUNTO') } } }),
    prisma.topico.findMany({ where: { id: { in: ids('TOPICO') } } }),
    prisma.conceito.findMany({ where: { id: { in: ids('CONCEITO') } } }),
    prisma.nota.findMany({ where: { id: { in: ids('NOTA') } } }),
    prisma.flashcard.findMany({ where: { id: { in: ids('FLASHCARD') } }, include: { aprendizado: true } }),
    prisma.textoBruto.findMany({ where: { id: { in: ids('TEXTO_BRUTO') } } }),
    prisma.baralho.findMany({ where: { id: { in: ids('BARALHO') } } }),
  ]);

  const nodes: GraphNode[] = graphNodes.map((n) => ({
    id: n.referenciaId,
    label: resolveLabel(n.tipoNode, n.referenciaId, subjects, topicos, conceitos, notas, flashcards, textosBrutos, baralhos),
    type: n.tipoNode as GraphNode['type'],
    nivelDominio: n.nivelDominio,
    prioridadeRevisao: 5,
    pergunta: n.tipoNode === 'FLASHCARD' ? flashcards.find((f) => f.id === n.referenciaId)?.pergunta : undefined,
  }));

  const nodeIdToRef = new Map(graphNodes.map((n) => [n.id, n.referenciaId]));
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const e of graphEdges) {
    let src = e.nodeOrigemId ? nodeIdToRef.get(e.nodeOrigemId) ?? '' : '';
    let tgt = e.nodeDestinoId ? nodeIdToRef.get(e.nodeDestinoId) ?? '' : '';
    if (e.notaOrigemId) src = e.notaOrigemId;
    if (e.notaDestinoId) tgt = e.notaDestinoId;
    if (!src || !tgt) continue;
    const key = `${src}→${tgt}→${e.tipoRelacao}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ source: src, target: tgt, type: e.tipoRelacao, peso: e.peso });
  }

  const mastery = new Map<string, number>();
  const nowMs = Date.now();
  const MS_PER_DAY = 86_400_000;
  for (const fc of flashcards) {
    const ap = fc.aprendizado.find((a: any) => a.usuarioId === userId);
    if (!ap) { mastery.set(fc.id, 0); continue; }
    const base = clamp01(1 - ap.dificuldade / 10);
    const daysOverdue = Math.max(0, (nowMs - new Date(ap.proximaRevisao).getTime()) / MS_PER_DAY);
    const interval = Math.max(1, ap.intervalo);
    // Decaimento exponencial: perde ~63% após 1 intervalo sem revisão
    const decay = Math.exp(-daysOverdue / interval);
    mastery.set(fc.id, base * decay);
  }
  applyDomainFromFlashcards(nodes, edges, mastery);

  return { nodes, edges };
}
