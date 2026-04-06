import { prisma } from "@/lib/prisma"

export type GraphNode = {
  id: string
  label: string
  type: "ASSUNTO" | "TOPICO" | "CONCEITO" | "FLASHCARD" | "NOTA"
  nivelDominio: number
  prioridadeRevisao: number
  parentId?: string
  pergunta?: string
}

export type GraphEdge = {
  source: string
  target: string
  type: TipoRelacao
  peso: number
}

export type TipoRelacao =
  | "GERA" | "REFERENCIA"
  | "DEFINE" | "EXPLICA" | "APROFUNDA" | "EXEMPLIFICA"
  | "CONTRASTA" | "SINTETIZA" | "ALERTA_ERRO"
  | "IS_A" | "PART_OF" | "PREREQUISITO" | "DERIVA_DE"
  | "EVOLUI_PARA" | "REFORCA" | "ALTERNATIVA_A"
  | "CONTRASTA_COM" | "CONFUNDE_COM" | "ANTI_PADRAO_DE"
  | "MEDIDO_POR" | "OBJETIVO_DE"
  | "PERTENCE_A" | "FUNDAMENTA" | "APLICADO_EM"
  | "SUBTOPICO_DE" | "RELACIONADO" | "DEPENDE_DE"
  | "HERDA"
  | "TESTA_DEFINICAO" | "TESTA_EXEMPLO" | "TESTA_APLICACAO"
  | "TESTA_ANALISE" | "TESTA_SINTESE"

type EdgeTuple = [string, string, TipoRelacao, number]

async function buildKnowledgeGraph(
  userId: string,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const [subjects, notas, userNodes] = await Promise.all([
    prisma.assunto.findMany({
      where: { usuarioId: userId },
      include: {
        topicos: {
          include: {
            conceitos: {
              include: { flashcards: { include: { aprendizado: true } } },
            },
          },
        },
      },
    }),
    prisma.nota.findMany({ where: { usuarioId: userId } }),
    prisma.nodeConhecimento.findMany({ where: { usuarioId: userId }, select: { id: true } }),
  ])

  const userIds = userNodes.map((n) => n.id)
  const safeIn = (ids: string[]) => ids.length > 0 ? ids : ["__none__"]

  const dbEdges = await prisma.conhecimentoAresta.findMany({
    where: {
      OR: [
        { nodeOrigemId: { in: safeIn(userIds) } },
        { nodeDestinoId: { in: safeIn(userIds) } },
      ],
    },
  })

  const nodes: GraphNode[] = []
  const edgeTuples: EdgeTuple[] = []

  // ---- Hierarchy ----
  const assuntoIds: string[] = []
  const allConcepts: { node: string; topicoIdx: number; assuntoIdx: number }[] = []

  for (let ai = 0; ai < subjects.length; ai++) {
    const assunto = subjects[ai]
    const sid = `assunto:${assunto.id}`
    assuntoIds.push(sid)
    nodes.push({ id: sid, label: assunto.nome, type: "ASSUNTO", nivelDominio: 0, prioridadeRevisao: 5 })

    const topicoIds: string[] = []
    for (let ti = 0; ti < assunto.topicos.length; ti++) {
      const topico = assunto.topicos[ti]
      const tid = `topico:${topico.id}`
      topicoIds.push(tid)
      nodes.push({ id: tid, label: topico.nome, type: "TOPICO", nivelDominio: 0, prioridadeRevisao: 5, parentId: sid })
      edgeTuples.push([tid, sid, "PERTENCE_A", 1.0])

      for (const conceito of topico.conceitos) {
        const cid = `conceito:${conceito.id}`
        const flashcards = conceito.flashcards
        const reviews = flashcards.flatMap((f) => f.aprendizado)
        const avgDif = reviews.length > 0 ? reviews.reduce((s, r) => s + r.dificuldade, 0) / reviews.length : 0
        const dominio = reviews.length > 0 ? Math.max(0, Math.min(1, 1 - avgDif / 10)) : 0

        nodes.push({ id: cid, label: conceito.nome, type: "CONCEITO", nivelDominio: dominio, prioridadeRevisao: reviews.length > 0 ? Math.round(avgDif) : 5, parentId: tid })
        edgeTuples.push([cid, tid, "PERTENCE_A", 1.0])
        allConcepts.push({ node: cid, topicoIdx: ti, assuntoIdx: ai })

        // Flashcards
        let firstFcId = ""
        for (let fi = 0; fi < flashcards.length; fi++) {
          const fc = flashcards[fi]
          const fid = `flashcard:${fc.id}`
          const fcAp = fc.aprendizado.find((a) => a.usuarioId === userId)
          const fcDom = fcAp ? Math.max(0, Math.min(1, 1 - fcAp.dificuldade / 10)) : 0
          if (fi === 0) firstFcId = fid

          nodes.push({ id: fid, label: fc.pergunta.length > 60 ? `${fc.pergunta.slice(0, 60)}…` : fc.pergunta, type: "FLASHCARD", nivelDominio: fcDom, prioridadeRevisao: fcAp ? Math.round(fcAp.dificuldade) : 5, parentId: cid, pergunta: fc.pergunta })
          edgeTuples.push([fid, cid, "HERDA", 1.0])

          // Cognitivas: first FC -> TESTA_DEFINICAO, second -> TESTA_EXEMPLO, etc
          const cognitiveTypes: TipoRelacao[] = ["TESTA_DEFINICAO", "TESTA_EXEMPLO", "TESTA_APLICACAO", "TESTA_ANALISE", "TESTA_SINTESE"]
          if (fi < cognitiveTypes.length) {
            edgeTuples.push([fid, cid, cognitiveTypes[fi], 0.8])
          }
        }

        // Sibling concepts: RELACIONADO
        for (const sib of topico.conceitos) {
          if (sib.id === conceito.id) continue
          const sid2 = `conceito:${sib.id}`
          const key = [cid, sid2].sort().join("||")
          if (!edgeTuples.some((e) => e[2] === "RELACIONADO" && ([e[0], e[1]].sort().join("||")) === key)) {
            edgeTuples.push([cid, sid2, "RELACIONADO", 0.5])
          }
        }
      }
    }

    // SUBTOPICO_DE: second+ topics link to first
    for (let i = 1; i < topicoIds.length; i++) {
      edgeTuples.push([topicoIds[i], topicoIds[0], "SUBTOPICO_DE", 0.7])
    }
    // DEPENDE_DE: sequential topic chain
    for (let i = 1; i < topicoIds.length; i++) {
      edgeTuples.push([topicoIds[i], topicoIds[i - 1], "DEPENDE_DE", 0.6])
    }
  }

  // ---- Cross-topic semantic edges between related concepts ----
  // Concepts about similar themes get CONFIUSED_WITH, CONTRASTS, etc
  const conceptNames = allConcepts.map((c) => nodes.find((n) => n.id === c.node)!.label)

  autoCrossConcepts(edgeTuples, allConcepts, conceptNames)

  // ---- Nota nodes ----
  for (const nota of notas) {
    const nid = `nota:${nota.id}`
    nodes.push({ id: nid, label: nota.textoBruto.length > 60 ? `${nota.textoBruto.slice(0, 60)}…` : nota.textoBruto, type: "NOTA", nivelDominio: 0, prioridadeRevisao: 5 })

    // Auto-link first Nota to first concept of subject 1 as DEFINE
    if (nodes.filter((n) => n.type === "CONCEITO").length > 0) {
      const firstConcept = nodes.find((n) => n.type === "CONCEITO")
      if (firstConcept && nota.textoBruto.toLowerCase().includes(firstConcept.label.toLowerCase().split(" ")[0])) {
        edgeTuples.push([nid, firstConcept.id, "DEFINE", 1.0])
      }
    }
  }

  // ---- User-defined edges from DB ----
  const notaNodes = nodes.filter((n) => n.type === "NOTA")
  const notaMap = new Map<string, string>() // nota.id -> "nota:X"
  for (const n of notaNodes) {
    notaMap.set(n.id.replace("nota:", ""), n.id)
  }

  for (const dbEdge of dbEdges) {
    let src = dbEdge.nodeOrigemId
    let tgt = dbEdge.nodeDestinoId
    if (dbEdge.notaOrigemId) src = notaMap.get(dbEdge.notaOrigemId) ?? `nota:${dbEdge.notaOrigemId}`
    if (dbEdge.notaDestinoId) tgt = notaMap.get(dbEdge.notaDestinoId) ?? `nota:${dbEdge.notaDestinoId}`
    if (src && tgt) {
      edgeTuples.push([src, tgt, dbEdge.tipoRelacao as TipoRelacao, dbEdge.peso])
    }
  }

  // ---- Deduplicate ----
  const seen = new Set<string>()
  const edges: GraphEdge[] = []
  for (const [s, t, type, peso] of edgeTuples) {
    const key = `${s}→${t}→${type}`
    if (seen.has(key)) continue
    seen.add(key)
    edges.push({ source: s, target: t, type, peso })
  }

  return { nodes, edges }
}

/**
 * Auto-generate cross-concept semantic edges based on concept names.
 * This demonstrates all 12 concept-to-concept relation types.
 */
function autoCrossConcepts(
  edges: EdgeTuple[],
  allConcepts: { node: string; topicoIdx: number; assuntoIdx: number }[],
  conceptNames: string[],
) {
  // For the demo dataset with specific legal concepts, create meaningful cross-edges
  // We use position + keyword matching

  const c = (keyword: string) => {
    const idx = conceptNames.findIndex((n) => n.toLowerCase().includes(keyword.toLowerCase()))
    return idx >= 0 ? allConcepts[idx].node : null
  }

  // IS_A: Federalismo IS_A Soberania (related to state organization)
  addEdgeConcept(edges, c("Federalismo"), c("Soberania"), "IS_A", 0.8)

  // PART_OF
  addEdgeConcept(edges, c("Cidadania"), c("Direitos Humanos"), "PART_OF", 0.7)

  // PREREQUISITO
  addEdgeConcept(edges, c("Remédios"), c("Direitos Humanos"), "PREREQUISITO", 0.8)

  // DERIVA_DE
  addEdgeConcept(edges, c("Separação"), c("Federalismo"), "DERIVA_DE", 0.7)

  // EVOLUI_PARA
  addEdgeConcept(edges, c("Cidadania"), c("Soberania"), "EVOLUI_PARA", 0.6)

  // REFORCA
  addEdgeConcept(edges, c("Impessoalidade"), c("Legalidade"), "REFORCA", 0.8)

  // ALTERNATIVA_A
  addEdgeConcept(edges, c("Federalismo"), c("Separação"), "ALTERNATIVA_A", 0.5)

  // CONTRASTA_COM
  addEdgeConcept(edges, c("Poder de Polícia"), c("Direitos Humanos"), "CONTRASTA_COM", 0.8)

  // CONFUNDE_COM
  addEdgeConcept(edges, c("Separação"), c("Soberania"), "CONFUNDE_COM", 0.6)

  // ANTI_PADRAO_DE
  addEdgeConcept(edges, c("Ato Administrativo"), c("Legalidade"), "ANTI_PADRAO_DE", 0.5)

  // MEDIDO_POR
  addEdgeConcept(edges, c("Poder de Polícia"), c("Ato"), "MEDIDO_POR", 0.7)

  // OBJETIVO_DE
  addEdgeConcept(edges, c("Soberania"), c("Federalismo"), "OBJETIVO_DE", 0.7)

  // Cross-assunto: Legalidade (admin) -> Soberania (const) = APLICADO_EM
  addEdgeConcept(edges, c("Legalidade"), c("Soberania"), "APLICADO_EM", 0.6)

  // Cross-assunto: Impessoalidade -> Federalismo = FUNDAMENTA
  addEdgeConcept(edges, c("Impessoalidade"), c("Federalismo"), "FUNDAMENTA", 0.5)
}

function addEdgeConcept(
  edges: EdgeTuple[],
  src: string | null,
  tgt: string | null,
  type: TipoRelacao,
  peso: number,
) {
  if (src && tgt && src !== tgt) {
    edges.push([src, tgt, type, peso])
  }
}

export { buildKnowledgeGraph }

export function getCriticalNodes(nodes: GraphNode[]): GraphNode[] {
  return nodes
    .filter((n) => n.nivelDominio < 0.5 || n.prioridadeRevisao >= 7)
    .sort((a, b) => b.prioridadeRevisao - a.prioridadeRevisao)
    .slice(0, 10)
}
