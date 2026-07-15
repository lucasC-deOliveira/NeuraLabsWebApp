import type { PrismaClient } from '@prisma/client';
import {
  applyDomainFromFlashcards,
  computeMastery,
  type GraphEdge,
  type GraphNode,
} from '../modules/graph/domain/services/domain-propagation';

export type { GraphNode, GraphEdge };

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
  questoes: any[],
  provas: any[],
  editais: any[],
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
    case 'QUESTION': {
      const q = questoes.find((x) => x.id === refId);
      return q?.enunciado ? trunc(q.enunciado) : refId;
    }
    case 'PROVA': {
      const p = provas.find((x) => x.id === refId);
      return p?.titulo ?? refId;
    }
    case 'EDITAL': {
      const e = editais.find((x) => x.id === refId);
      return e?.titulo ?? refId;
    }
    default:
      return refId;
  }
}

// Derives PROVA→QUESTION (CONTEM) edges from the ProvaQuestao join for the provas and
// questions present in the graph — the relationship is implicit in the data, not stored.
async function addDerivedProvaQuestaoEdges(
  prisma: PrismaClient,
  byType: Record<string, Set<string>>,
  seen: Set<string>,
  edges: GraphEdge[],
): Promise<void> {
  const provaSet = byType['PROVA'];
  const questaoSet = byType['QUESTION'];
  if (!provaSet || !questaoSet) return;
  const links = await prisma.provaQuestao.findMany({
    where: { provaId: { in: [...provaSet] } },
    select: { provaId: true, questaoId: true },
  });
  for (const { provaId, questaoId } of links) {
    if (!questaoSet.has(questaoId)) continue;
    const key = `${provaId}→${questaoId}→CONTEM`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ source: provaId, target: questaoId, type: 'CONTEM', peso: 1 });
  }
}

// Monta o grafo (nós + arestas) de um grafo específico. SRS (aprendizado) entra
// no cálculo do domínio.
// Acima deste limite, nós FLASHCARD são omitidos do grafo para evitar freeze do renderer.
// Flashcards ainda ficam acessíveis pelo painel de detalhes do baralho.
const FLASHCARD_NODE_DISPLAY_LIMIT = 500;

export async function buildKnowledgeGraph(
  prisma: PrismaClient,
  userId: string,
  grafoId: string,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  // O grafo é uma VISTA: mostra os nós que ele contém (grafo_nodes) e as arestas
  // cujas DUAS pontas ele contém. Antes ambos eram filtrados pela coluna id_grafo
  // do próprio nó/aresta — o que só funcionava porque o nó pertencia a um grafo só.
  // Escopar a aresta pelas pontas também corrige um bug latente: `extract` move os
  // nós para o subgrafo mas deixa as arestas internas com o id_grafo do pai, então
  // a vista do filho não as enxergava.
  let [graphNodes, graphEdges] = await Promise.all([
    prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, contidoEm: { some: { grafoId } } },
      // A posição vem da contenção: é desta vista, não do nó.
      include: { contidoEm: { where: { grafoId }, select: { posicaoX: true, posicaoY: true } } },
    }),
    prisma.conhecimentoAresta.findMany({
      where: {
        nodeOrigem: { contidoEm: { some: { grafoId } } },
        nodeDestino: { contidoEm: { some: { grafoId } } },
      },
    }),
  ]);

  // Filtra nós FLASHCARD quando há muitos — 14k nós freezam o renderer SVG
  const flashcardNodeCount = graphNodes.filter((n) => n.tipoNode === 'FLASHCARD').length;
  if (flashcardNodeCount > FLASHCARD_NODE_DISPLAY_LIMIT) {
    const fcNodeIds = new Set(
      graphNodes.filter((n) => n.tipoNode === 'FLASHCARD').map((n) => n.id),
    );
    graphNodes = graphNodes.filter((n) => n.tipoNode !== 'FLASHCARD');
    graphEdges = graphEdges.filter(
      (e) => !fcNodeIds.has(e.nodeOrigemId ?? '') && !fcNodeIds.has(e.nodeDestinoId ?? ''),
    );
  }

  const byType: Record<string, Set<string>> = {};
  for (const n of graphNodes) (byType[n.tipoNode] ??= new Set()).add(n.referenciaId);
  const ids = (t: string) => (byType[t] ? [...byType[t]!] : ['__none__']);

  const [
    subjects,
    topicos,
    conceitos,
    notas,
    flashcards,
    textosBrutos,
    baralhos,
    grafoRefs,
    questoes,
    provas,
    editais,
  ] = await Promise.all([
    prisma.assunto.findMany({ where: { id: { in: ids('ASSUNTO') } } }),
    prisma.topico.findMany({ where: { id: { in: ids('TOPICO') } } }),
    prisma.conceito.findMany({ where: { id: { in: ids('CONCEITO') } } }),
    prisma.nota.findMany({ where: { id: { in: ids('NOTA') } } }),
    // Subquery JOIN evita IN clause com 14k+ IDs. SQL cru: não é typechecado, então
    // a contenção entra aqui à mão (grafo_nodes → NodeConhecimento).
    byType['FLASHCARD']
      ? (prisma as any)
          .$queryRaw`SELECT f.id, LEFT(f.pergunta, 80) AS pergunta FROM flashcards f WHERE f.id IN (SELECT n.referencia_id FROM "NodeConhecimento" n JOIN grafo_nodes gn ON gn.id_node = n.id WHERE gn.id_grafo = ${grafoId} AND n."tipoNode" = 'FLASHCARD')`
      : Promise.resolve([]),
    prisma.textoBruto.findMany({ where: { id: { in: ids('TEXTO_BRUTO') } } }),
    prisma.baralho.findMany({ where: { id: { in: ids('BARALHO') } } }),
    byType['GRAFO_REF']
      ? prisma.grafosConhecimento.findMany({
          where: { id: { in: ids('GRAFO_REF') } },
          select: {
            id: true,
            nome: true,
            tipoRelacaoPai: true,
            // Quantos nós o subgrafo mostra = quantos ele contém.
            _count: { select: { grafoNodes: true } },
          },
        })
      : Promise.resolve([]),
    byType['QUESTION']
      ? (prisma as any).questao.findMany({
          where: { id: { in: ids('QUESTION') } },
          select: { id: true, enunciado: true, tipo: true },
        })
      : Promise.resolve([]),
    byType['PROVA']
      ? (prisma as any).prova.findMany({
          where: { id: { in: ids('PROVA') } },
          select: { id: true, titulo: true, _count: { select: { questoes: true } } },
        })
      : Promise.resolve([]),
    byType['EDITAL']
      ? (prisma as any).edital.findMany({
          where: { id: { in: ids('EDITAL') } },
          select: { id: true, titulo: true },
        })
      : Promise.resolve([]),
  ]);

  const nodes: GraphNode[] = graphNodes.map((n) => {
    const grafoRefMeta =
      n.tipoNode === 'GRAFO_REF'
        ? (() => {
            const g = (grafoRefs as any[]).find((x: any) => x.id === n.referenciaId);
            return g
              ? {
                  nome: g.nome,
                  nodeCount: g._count.grafoNodes,
                  tipoRelacao: g.tipoRelacaoPai ?? null,
                }
              : undefined;
          })()
        : undefined;
    return {
      id: n.referenciaId,
      label:
        n.tipoNode === 'GRAFO_REF'
          ? ((grafoRefs as any[]).find((x: any) => x.id === n.referenciaId)?.nome ?? 'Subgrafo')
          : resolveLabel(
              n.tipoNode,
              n.referenciaId,
              subjects,
              topicos,
              conceitos,
              notas,
              flashcards,
              textosBrutos,
              baralhos,
              questoes,
              provas,
              editais,
            ),
      type: n.tipoNode as GraphNode['type'],
      nivelDominio: n.nivelDominio,
      prioridadeRevisao: 5,
      pergunta:
        n.tipoNode === 'FLASHCARD'
          ? (flashcards as any[]).find((f: any) => f.id === n.referenciaId)?.pergunta
          : undefined,
      grafoRefMeta,
      posicaoX: n.contidoEm[0]?.posicaoX ?? null,
      posicaoY: n.contidoEm[0]?.posicaoY ?? null,
    };
  });

  const nodeIdToRef = new Map(graphNodes.map((n) => [n.id, n.referenciaId]));
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const e of graphEdges) {
    let src = e.nodeOrigemId ? (nodeIdToRef.get(e.nodeOrigemId) ?? '') : '';
    let tgt = e.nodeDestinoId ? (nodeIdToRef.get(e.nodeDestinoId) ?? '') : '';
    if (e.notaOrigemId) src = e.notaOrigemId;
    if (e.notaDestinoId) tgt = e.notaDestinoId;
    if (!src || !tgt) continue;
    const key = `${src}→${tgt}→${e.tipoRelacao}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ source: src, target: tgt, type: e.tipoRelacao, peso: e.peso });
  }

  // PROVA→QUESTION edges aren't stored — they're derived from the exam's questions
  // (ProvaQuestao) so a prova always shows connected to whichever of its questions
  // are in the graph.
  await addDerivedProvaQuestaoEdges(prisma, byType, seen, edges);

  const mastery = new Map<string, number>();
  const nowMs = Date.now();
  for (const fc of flashcards) {
    const apList: any[] = (fc as any).aprendizado;
    const ap = apList?.find((a: any) => a.usuarioId === userId);
    mastery.set(fc.id, ap ? computeMastery(ap, nowMs) : 0);
  }
  applyDomainFromFlashcards(nodes, edges, mastery);

  return { nodes, edges };
}
