import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildKnowledgeGraph } from './knowledge-graph';
import { getAllowedRelations, isRelationAllowed } from './relation-rules';

type TipoNode = 'ASSUNTO' | 'TOPICO' | 'CONCEITO' | 'FLASHCARD' | 'NOTA' | 'TEXTO_BRUTO' | 'BARALHO';

const NOTA_SUBTIPOS = ['DEFINICAO', 'EXPLICACAO', 'EXEMPLO', 'COMPARACAO', 'SINTESE', 'PREREQUISITO', 'ERRO_COMUM', 'APLICACAO'];

export interface CreateNodeInput {
  tipoNode: TipoNode;
  nome?: string;
  descricao?: string | null;
  pergunta?: string;
  resposta?: string;
  titulo?: string;
  conteudo?: string;
  tipoNota?: string;
  subtipo?: string;
  fonte?: string | null;
  texto?: string;
  posicaoX?: number | null;
  posicaoY?: number | null;
  nivelDominio?: number;
}

function notaSlug(titulo: string, when: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${when.getFullYear()}${p(when.getMonth() + 1)}${p(when.getDate())}${p(when.getHours())}${p(when.getMinutes())}${p(when.getSeconds())}`;
  const slug = titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  return slug ? `${stamp}-${slug}` : stamp;
}

@Injectable()
export class GraphService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Grafos ----
  listGraphs(userId: string) {
    return this.prisma.grafosConhecimento.findMany({ where: { usuarioId: userId }, orderBy: { dataCriacao: 'desc' } });
  }

  async createGraph(userId: string, nome: string, descricao?: string) {
    const g = await this.prisma.grafosConhecimento.create({ data: { usuarioId: userId, nome: nome.trim() || 'Novo grafo', descricao: descricao ?? null } });
    return { id: g.id };
  }

  async deleteGraph(userId: string, grafoId: string) {
    const g = await this.prisma.grafosConhecimento.findFirst({ where: { id: grafoId, usuarioId: userId } });
    if (!g) throw new NotFoundException('Grafo não encontrado');
    await this.prisma.grafosConhecimento.delete({ where: { id: grafoId } });
    return { success: true };
  }

  async getGraphInfo(userId: string, grafoId: string) {
    const g = await this.prisma.grafosConhecimento.findFirst({ where: { id: grafoId, usuarioId: userId } });
    return g ? { nome: g.nome, descricao: g.descricao ?? undefined } : null;
  }

  async updateGraphName(userId: string, grafoId: string, nome: string) {
    await this.prisma.grafosConhecimento.updateMany({ where: { id: grafoId, usuarioId: userId }, data: { nome: nome.trim() } });
    return { success: true };
  }

  async saveVisualState(userId: string, grafoId: string, state: unknown) {
    await this.prisma.grafosConhecimento.updateMany({ where: { id: grafoId, usuarioId: userId }, data: { estadoVisual: JSON.stringify(state) } });
    return { success: true };
  }

  async loadVisualState(userId: string, grafoId: string) {
    const g = await this.prisma.grafosConhecimento.findFirst({ where: { id: grafoId, usuarioId: userId }, select: { estadoVisual: true } });
    if (!g?.estadoVisual) return null;
    try { return JSON.parse(g.estadoVisual); } catch { return null; }
  }

  // ---- Leitura do grafo (nós + arestas + posições) ----
  async loadGraph(userId: string, grafoId: string) {
    const { nodes, edges } = await buildKnowledgeGraph(this.prisma, userId, grafoId);
    const posRows = await this.prisma.nodeConhecimento.findMany({ where: { grafoId }, select: { referenciaId: true, posicaoX: true, posicaoY: true } });
    const pos = new Map(posRows.map((r) => [r.referenciaId, { x: r.posicaoX ?? 0, y: r.posicaoY ?? 0 }]));
    return {
      nodes: nodes.map((n) => {
        const p = pos.get(n.id.includes(':') ? n.id.split(':').slice(1).join(':') : n.id);
        return { ...n, posicaoX: p?.x, posicaoY: p?.y };
      }),
      edges,
    };
  }

  // ---- Nós ----
  async createNode(userId: string, grafoId: string, input: CreateNodeInput) {
    const grafo = await this.prisma.grafosConhecimento.findFirst({ where: { id: grafoId, usuarioId: userId } });
    if (!grafo) throw new NotFoundException('Grafo não encontrado');
    const now = new Date();
    let entityId: string;
    switch (input.tipoNode) {
      case 'FLASHCARD':
        entityId = (await this.prisma.flashcard.create({ data: { pergunta: input.pergunta ?? '', resposta: input.resposta ?? '', usuarioId: userId, dataCriacao: now } })).id;
        break;
      case 'NOTA': {
        const titulo = (input.titulo ?? '').trim();
        if (!titulo) throw new BadRequestException('O título da nota é obrigatório');
        if (!input.subtipo || !NOTA_SUBTIPOS.includes(input.subtipo)) throw new BadRequestException('Selecione o subtipo da nota');
        if ((input.tipoNota ?? 'PERMANENTE') === 'LITERATURA' && !input.fonte?.trim()) throw new BadRequestException('Notas de literatura exigem a fonte');
        entityId = (await this.prisma.nota.create({ data: { titulo, tipoNota: input.tipoNota ?? 'PERMANENTE', subtipo: input.subtipo, fonte: input.fonte?.trim() || null, slug: notaSlug(titulo, now), conteudo: input.conteudo ?? '', usuarioId: userId, dataCriacao: now } })).id;
        break;
      }
      case 'TEXTO_BRUTO':
        if (!input.texto?.trim()) throw new BadRequestException('O texto original é obrigatório');
        entityId = (await this.prisma.textoBruto.create({ data: { titulo: input.titulo?.trim() || 'Texto sem título', texto: input.texto.trim(), usuarioId: userId, dataCriacao: now } })).id;
        break;
      case 'ASSUNTO':
        entityId = (await this.prisma.assunto.create({ data: { nome: input.nome ?? '', descricao: input.descricao ?? null, usuarioId: userId } })).id;
        break;
      case 'TOPICO':
        entityId = (await this.prisma.topico.create({ data: { nome: input.nome ?? '', descricao: input.descricao ?? null, usuarioId: userId } })).id;
        break;
      case 'CONCEITO':
        entityId = (await this.prisma.conceito.create({ data: { nome: input.nome ?? '', descricao: input.descricao ?? null, usuarioId: userId } })).id;
        break;
      case 'BARALHO':
        entityId = (await this.prisma.baralho.create({ data: { titulo: (input.titulo ?? input.nome ?? '').trim(), usuarioId: userId, dataCriacao: now } })).id;
        break;
      default:
        throw new BadRequestException(`Tipo de nó desconhecido: ${input.tipoNode}`);
    }
    await this.prisma.nodeConhecimento.create({
      data: { grafoId, tipoNode: input.tipoNode as any, referenciaId: entityId, usuarioId: userId, posicaoX: input.posicaoX ?? null, posicaoY: input.posicaoY ?? null, nivelDominio: input.nivelDominio ?? 0 },
    });
    return { nodeId: entityId };
  }

  async updateNode(userId: string, tipoNode: TipoNode, refId: string, data: Partial<CreateNodeInput>) {
    const where = { id: refId, usuarioId: userId };
    let count = 0;
    switch (tipoNode) {
      case 'ASSUNTO': count = (await this.prisma.assunto.updateMany({ where, data: { nome: data.nome, descricao: data.descricao } })).count; break;
      case 'TOPICO': count = (await this.prisma.topico.updateMany({ where, data: { nome: data.nome, descricao: data.descricao } })).count; break;
      case 'CONCEITO': count = (await this.prisma.conceito.updateMany({ where, data: { nome: data.nome, descricao: data.descricao } })).count; break;
      case 'FLASHCARD': count = (await this.prisma.flashcard.updateMany({ where, data: { pergunta: data.pergunta, resposta: data.resposta } })).count; break;
      case 'NOTA':
        if (data.subtipo && !NOTA_SUBTIPOS.includes(data.subtipo)) throw new BadRequestException('Subtipo inválido');
        count = (await this.prisma.nota.updateMany({ where, data: { titulo: data.titulo?.trim(), conteudo: data.conteudo, tipoNota: data.tipoNota, subtipo: data.subtipo, fonte: data.fonte === undefined ? undefined : data.fonte?.trim() || null } })).count;
        break;
      case 'TEXTO_BRUTO': count = (await this.prisma.textoBruto.updateMany({ where, data: { titulo: data.titulo?.trim(), texto: data.texto?.trim() } })).count; break;
      default: throw new BadRequestException(`Tipo de nó desconhecido: ${tipoNode}`);
    }
    if (count === 0) throw new NotFoundException('Nó não encontrado');
    return { success: true };
  }

  async deleteNode(userId: string, refId: string, grafoId?: string) {
    const node = await this.prisma.nodeConhecimento.findFirst({ where: { referenciaId: refId, usuarioId: userId, ...(grafoId ? { grafoId } : {}) } });
    if (!node) throw new NotFoundException('Nó não encontrado');
    const tipo = node.tipoNode;
    await this.prisma.$transaction(async (tx) => {
      await tx.conhecimentoAresta.deleteMany({ where: { OR: [{ nodeOrigemId: node.id }, { nodeDestinoId: node.id }] } });
      await tx.desempenhoNo.deleteMany({ where: { nodeId: node.id } });
      switch (tipo) {
        case 'FLASHCARD':
          await tx.revisaoFlashcard.deleteMany({ where: { flashcardId: refId } });
          await tx.aprendizadoFlashcard.deleteMany({ where: { flashcardId: refId } });
          await tx.flashcard.delete({ where: { id: refId } });
          break;
        case 'NOTA': await tx.nota.delete({ where: { id: refId } }); break;
        case 'ASSUNTO': await tx.topico.updateMany({ where: { assuntoId: refId }, data: { assuntoId: null } }); await tx.assunto.delete({ where: { id: refId } }); break;
        case 'TOPICO': await tx.conceito.updateMany({ where: { topicoId: refId }, data: { topicoId: null } }); await tx.topico.delete({ where: { id: refId } }); break;
        case 'CONCEITO': await tx.conceito.delete({ where: { id: refId } }); break;
        case 'TEXTO_BRUTO': await tx.textoBruto.delete({ where: { id: refId } }); break;
        case 'BARALHO': await tx.baralho.delete({ where: { id: refId } }); break;
      }
      await tx.nodeConhecimento.delete({ where: { id: node.id } });
    });
    return { success: true, deletedType: tipo };
  }

  // Remove o nó do grafo (vínculo + arestas + desempenho), mantendo a entidade.
  async removeNode(userId: string, grafoId: string, refId: string) {
    const node = await this.prisma.nodeConhecimento.findFirst({ where: { referenciaId: refId, usuarioId: userId, grafoId } });
    if (!node) throw new NotFoundException('Nó não encontrado no grafo');
    await this.prisma.$transaction(async (tx) => {
      await tx.conhecimentoAresta.deleteMany({ where: { OR: [{ nodeOrigemId: node.id }, { nodeDestinoId: node.id }] } });
      await tx.desempenhoNo.deleteMany({ where: { nodeId: node.id } });
      await tx.nodeConhecimento.delete({ where: { id: node.id } });
    });
    return { success: true };
  }

  async getNodeDetails(userId: string, tipoNode: TipoNode, refId: string): Promise<Record<string, string | null> | null> {
    switch (tipoNode) {
      case 'ASSUNTO': { const a = await this.prisma.assunto.findFirst({ where: { id: refId, usuarioId: userId } }); return a ? { nome: a.nome, descricao: a.descricao } : null; }
      case 'TOPICO': { const t = await this.prisma.topico.findFirst({ where: { id: refId, usuarioId: userId } }); return t ? { nome: t.nome, descricao: t.descricao } : null; }
      case 'CONCEITO': { const c = await this.prisma.conceito.findFirst({ where: { id: refId, usuarioId: userId } }); return c ? { nome: c.nome, descricao: c.descricao } : null; }
      case 'FLASHCARD': { const f = await this.prisma.flashcard.findFirst({ where: { id: refId, usuarioId: userId } }); return f ? { pergunta: f.pergunta, resposta: f.resposta } : null; }
      case 'NOTA': { const n = await this.prisma.nota.findFirst({ where: { id: refId, usuarioId: userId } }); return n ? { titulo: n.titulo, conteudo: n.conteudo, tipoNota: n.tipoNota, subtipo: n.subtipo, fonte: n.fonte } : null; }
      case 'TEXTO_BRUTO': { const t = await this.prisma.textoBruto.findFirst({ where: { id: refId, usuarioId: userId } }); return t ? { titulo: t.titulo, texto: t.texto } : null; }
      case 'BARALHO': { const b = await this.prisma.baralho.findFirst({ where: { id: refId, usuarioId: userId } }); return b ? { titulo: b.titulo } : null; }
      default: return null;
    }
  }

  // ---- Arestas ----
  async getEdges(userId: string, grafoId: string) {
    const edges = await this.prisma.conhecimentoAresta.findMany({ where: { grafoId }, include: { nodeOrigem: true, nodeDestino: true } });
    const userEdges = edges.filter((e) => e.nodeOrigem?.usuarioId === userId && e.nodeDestino?.usuarioId === userId);
    return Promise.all(userEdges.map(async (e) => ({
      id: e.id,
      source: e.nodeOrigem!.referenciaId,
      target: e.nodeDestino!.referenciaId,
      tipoRelacao: e.tipoRelacao,
      peso: e.peso,
      sourceLabel: await this.label(e.nodeOrigem!.tipoNode, e.nodeOrigem!.referenciaId),
      targetLabel: await this.label(e.nodeDestino!.tipoNode, e.nodeDestino!.referenciaId),
    })));
  }

  private async label(tipoNode: string, refId: string): Promise<string> {
    switch (tipoNode) {
      case 'ASSUNTO': return (await this.prisma.assunto.findUnique({ where: { id: refId } }))?.nome ?? refId;
      case 'TOPICO': return (await this.prisma.topico.findUnique({ where: { id: refId } }))?.nome ?? refId;
      case 'CONCEITO': return (await this.prisma.conceito.findUnique({ where: { id: refId } }))?.nome ?? refId;
      case 'FLASHCARD': return (await this.prisma.flashcard.findUnique({ where: { id: refId } }))?.pergunta?.slice(0, 50) ?? refId;
      case 'NOTA': { const n = await this.prisma.nota.findUnique({ where: { id: refId } }); return (n?.titulo && n.titulo !== 'Sem título') ? n.titulo : (n?.conteudo?.slice(0, 50) ?? refId); }
      case 'TEXTO_BRUTO': { const t = await this.prisma.textoBruto.findUnique({ where: { id: refId } }); return (t?.titulo && t.titulo !== 'Texto sem título') ? t.titulo : (t?.texto?.slice(0, 50) ?? refId); }
      case 'BARALHO': return (await this.prisma.baralho.findUnique({ where: { id: refId } }))?.titulo ?? refId;
      default: return refId;
    }
  }

  async createEdge(userId: string, grafoId: string, input: { sourceNodeId: string; targetNodeId: string; tipoRelacao: string; peso?: number }) {
    if (input.peso !== undefined && (!Number.isFinite(input.peso) || input.peso <= 0 || input.peso > 2)) throw new BadRequestException('Peso inválido (0 a 2)');
    const [s, t] = await Promise.all([
      this.prisma.nodeConhecimento.findFirst({ where: { referenciaId: input.sourceNodeId, usuarioId: userId, grafoId } }),
      this.prisma.nodeConhecimento.findFirst({ where: { referenciaId: input.targetNodeId, usuarioId: userId, grafoId } }),
    ]);
    if (!s || !t) throw new NotFoundException('Nó(s) não encontrado(s) no grafo');
    if (!isRelationAllowed(s.tipoNode, t.tipoNode, input.tipoRelacao)) {
      const allowed = getAllowedRelations(s.tipoNode, t.tipoNode);
      throw new BadRequestException(allowed.length ? `Relação ${input.tipoRelacao} não permitida entre ${s.tipoNode} e ${t.tipoNode}` : `${s.tipoNode} e ${t.tipoNode} não podem ser relacionados`);
    }
    const dup = await this.prisma.conhecimentoAresta.findFirst({ where: { grafoId, nodeOrigemId: s.id, nodeDestinoId: t.id, tipoRelacao: input.tipoRelacao as any } });
    if (dup) throw new BadRequestException('Relação já existe entre esses nós com este tipo');
    const edge = await this.prisma.conhecimentoAresta.create({ data: { grafoId, nodeOrigemId: s.id, nodeDestinoId: t.id, tipoRelacao: input.tipoRelacao as any, peso: input.peso ?? 1 } });
    return { edgeId: edge.id };
  }

  async updateEdge(userId: string, grafoId: string, edgeId: string, data: { tipoRelacao?: string; peso?: number }) {
    const edge = await this.prisma.conhecimentoAresta.findFirst({ where: { id: edgeId, grafoId }, include: { nodeOrigem: true } });
    if (!edge || edge.nodeOrigem?.usuarioId !== userId) throw new NotFoundException('Relação não encontrada');
    await this.prisma.conhecimentoAresta.update({ where: { id: edgeId }, data: { tipoRelacao: data.tipoRelacao ? (data.tipoRelacao as any) : undefined, peso: data.peso } });
    return { success: true };
  }

  async deleteEdge(userId: string, grafoId: string, edgeId: string) {
    const edge = await this.prisma.conhecimentoAresta.findFirst({ where: { id: edgeId, grafoId }, include: { nodeOrigem: true } });
    if (!edge || edge.nodeOrigem?.usuarioId !== userId) throw new NotFoundException('Relação não encontrada');
    await this.prisma.conhecimentoAresta.delete({ where: { id: edgeId } });
    return { success: true };
  }

  // ---- Adicionar entidade existente ao grafo (só cria o vínculo) ----
  async addExistingNode(userId: string, grafoId: string, tipoNode: TipoNode, entityId: string) {
    const grafo = await this.prisma.grafosConhecimento.findFirst({ where: { id: grafoId, usuarioId: userId } });
    if (!grafo) throw new NotFoundException('Grafo não encontrado');
    await this.prisma.nodeConhecimento.create({
      data: { grafoId, tipoNode: tipoNode as any, referenciaId: entityId, usuarioId: userId, nivelDominio: 0 },
    });
    return { success: true, nodeId: entityId };
  }

  // ---- Itens existentes (não estão no grafo) para "Adicionar existentes" ----
  async availableItems(userId: string, grafoId: string) {
    const existing = await this.prisma.nodeConhecimento.findMany({ where: { grafoId, usuarioId: userId }, select: { referenciaId: true, tipoNode: true } });
    const inGraph: Record<string, string[]> = {};
    for (const n of existing) (inGraph[n.tipoNode] ??= []).push(n.referenciaId);

    const [flashcards, notas] = await Promise.all([
      this.prisma.flashcard.findMany({
        where: { usuarioId: userId, id: { notIn: inGraph.FLASHCARD ?? [] } },
        include: { conceito: { include: { topico: { include: { assunto: true } } } } },
        orderBy: { dataCriacao: 'desc' },
        take: 50,
      }),
      this.prisma.nota.findMany({ where: { usuarioId: userId, id: { notIn: inGraph.NOTA ?? [] } }, orderBy: { dataCriacao: 'desc' }, take: 50 }),
    ]);

    return {
      flashcards: flashcards.map((fc) => {
        const topico = fc.conceito?.topico;
        const assunto = topico?.assunto;
        return {
          id: fc.id,
          label: fc.pergunta.slice(0, 50) + (fc.pergunta.length > 50 ? '...' : ''),
          fullText: fc.pergunta,
          tipo: 'FLASHCARD',
          conceitoId: fc.conceitoId,
          hierarquia: assunto ? `${assunto.nome} → ${topico!.nome} → ${fc.conceito!.nome}` : fc.conceito ? `${fc.conceito.nome} (sem tópico)` : 'Sem conceito',
        };
      }),
      notas: notas.map((n) => ({ id: n.id, label: n.conteudo.slice(0, 50) + (n.conteudo.length > 50 ? '...' : ''), fullText: n.conteudo, tipo: 'NOTA', hierarquia: 'Nota direta' })),
    };
  }

  // flashcards do usuário (picker do baralho)
  async listFlashcardsForDeck(userId: string) {
    const fcs = await this.prisma.flashcard.findMany({ where: { usuarioId: userId }, include: { conceito: true }, orderBy: { dataCriacao: 'desc' } });
    return fcs.map((f) => ({ id: f.id, pergunta: f.pergunta, conceito: f.conceito?.nome ?? null }));
  }

  // ---- Baralho ----
  async createBaralho(userId: string, grafoId: string, titulo: string, flashcardIds: string[]) {
    const grafo = await this.prisma.grafosConhecimento.findFirst({ where: { id: grafoId, usuarioId: userId } });
    if (!grafo) throw new NotFoundException('Grafo não encontrado');
    const tituloTrim = titulo?.trim();
    if (!tituloTrim) throw new BadRequestException('O título do baralho é obrigatório');
    const ids = Array.from(new Set(flashcardIds ?? []));
    if (ids.length > 1000) throw new BadRequestException('Máximo de 1000 flashcards por baralho');
    if (ids.length > 0) {
      const count = await this.prisma.flashcard.count({ where: { id: { in: ids }, usuarioId: userId } });
      if (count !== ids.length) throw new BadRequestException('Um ou mais flashcards não pertencem ao usuário');
    }
    const now = new Date();
    const baralhoId = await this.prisma.$transaction(async (tx) => {
      const baralho = await tx.baralho.create({ data: { titulo: tituloTrim, usuarioId: userId, dataCriacao: now, flashcards: ids.length ? { connect: ids.map((id) => ({ id })) } : undefined } });
      const baralhoNode = await tx.nodeConhecimento.create({ data: { grafoId, tipoNode: 'BARALHO', referenciaId: baralho.id, usuarioId: userId } });
      for (const fcId of ids) {
        let fcNode = await tx.nodeConhecimento.findFirst({ where: { grafoId, usuarioId: userId, tipoNode: 'FLASHCARD', referenciaId: fcId }, select: { id: true } });
        if (!fcNode) fcNode = await tx.nodeConhecimento.create({ data: { grafoId, tipoNode: 'FLASHCARD', referenciaId: fcId, usuarioId: userId }, select: { id: true } });
        await tx.conhecimentoAresta.create({ data: { grafoId, nodeOrigemId: baralhoNode.id, nodeDestinoId: fcNode.id, tipoRelacao: 'CONTEM', peso: 1 } });
      }
      return baralho.id;
    });
    return { success: true, nodeId: baralhoId };
  }

  // ---- Busca por conteúdo (devolve refIds que casam) ----
  async searchNodeContent(userId: string, grafoId: string, query: string): Promise<string[]> {
    const term = (query ?? '').trim().slice(0, 200);
    if (!term || !grafoId) return [];
    const graphNodes = await this.prisma.nodeConhecimento.findMany({ where: { grafoId, usuarioId: userId }, select: { referenciaId: true, tipoNode: true } });
    const byType: Record<string, string[]> = {};
    for (const n of graphNodes) (byType[n.tipoNode] ??= []).push(n.referenciaId);
    const matched = new Set<string>();
    const add = (rows: { id: string }[]) => rows.forEach((r) => matched.add(r.id));
    const c = { contains: term, mode: 'insensitive' as const };
    await Promise.all([
      byType.NOTA?.length && this.prisma.nota.findMany({ where: { id: { in: byType.NOTA }, conteudo: c }, select: { id: true } }).then(add),
      byType.FLASHCARD?.length && this.prisma.flashcard.findMany({ where: { id: { in: byType.FLASHCARD }, OR: [{ pergunta: c }, { resposta: c }] }, select: { id: true } }).then(add),
      byType.TEXTO_BRUTO?.length && this.prisma.textoBruto.findMany({ where: { id: { in: byType.TEXTO_BRUTO }, texto: c }, select: { id: true } }).then(add),
      byType.CONCEITO?.length && this.prisma.conceito.findMany({ where: { id: { in: byType.CONCEITO }, descricao: c }, select: { id: true } }).then(add),
      byType.ASSUNTO?.length && this.prisma.assunto.findMany({ where: { id: { in: byType.ASSUNTO }, descricao: c }, select: { id: true } }).then(add),
      byType.TOPICO?.length && this.prisma.topico.findMany({ where: { id: { in: byType.TOPICO }, descricao: c }, select: { id: true } }).then(add),
    ]);
    return [...matched];
  }

  // ---- Posições ----
  async savePositions(userId: string, grafoId: string, positions: Record<string, { x: number; y: number }>) {
    const typeMap: Record<string, string> = { flashcard: 'FLASHCARD', nota: 'NOTA', assunto: 'ASSUNTO', topico: 'TOPICO', conceito: 'CONCEITO' };
    await this.prisma.$transaction(async (tx) => {
      for (const [refId, p] of Object.entries(positions)) {
        const id = refId.includes(':') ? refId.split(':').slice(1).join(':') : refId;
        const prefix = refId.includes(':') ? refId.split(':')[0].toLowerCase() : null;
        if (!prefix) continue;
        const tipoNode = typeMap[prefix];
        if (!tipoNode) continue;
        await tx.nodeConhecimento.updateMany({ where: { grafoId, usuarioId: userId, tipoNode: tipoNode as any, referenciaId: id }, data: { posicaoX: p.x, posicaoY: p.y } });
      }
    });
    return { success: true };
  }
}
