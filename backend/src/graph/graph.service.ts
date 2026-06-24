import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildKnowledgeGraph } from './knowledge-graph';
import { isRelationAllowed } from '../modules/graph/domain/services/relation-rules';
import { runImportGraph, type ImportGraphPayload } from './graph-import';
import { CreateEdgeUseCase } from '../modules/graph/application/use-cases/create-edge.use-case';
import { GetNodeDetailsUseCase } from '../modules/graph/application/use-cases/get-node-details.use-case';
import { GetEdgesUseCase } from '../modules/graph/application/use-cases/get-edges.use-case';

type TipoNode =
  | 'ASSUNTO'
  | 'TOPICO'
  | 'CONCEITO'
  | 'FLASHCARD'
  | 'NOTA'
  | 'TEXTO_BRUTO'
  | 'BARALHO'
  | 'GRAFO_REF'
  | 'QUESTION'
  | 'PROVA';

const GRAFO_REF_RELATIONS = [
  'PREREQUISITO',
  'APROFUNDA',
  'DERIVA_DE',
  'APLICADO_EM',
  'CONTRASTA_COM',
  'SINTETIZA',
  'RELACIONADO',
] as const;

const NOTA_SUBTIPOS = [
  'DEFINICAO',
  'EXPLICACAO',
  'EXEMPLO',
  'COMPARACAO',
  'SINTESE',
  'PREREQUISITO',
  'ERRO_COMUM',
  'APLICACAO',
];

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
  const slug = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug ? `${stamp}-${slug}` : stamp;
}

@Injectable()
export class GraphService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createEdgeUseCase: CreateEdgeUseCase,
    private readonly getNodeDetailsUseCase: GetNodeDetailsUseCase,
    private readonly getEdgesUseCase: GetEdgesUseCase,
  ) {}

  // ---- Grafos ----

  // Garante que o grafo tem um Assunto-raiz (cria sob demanda para grafos antigos
  // criados antes desta feature). Idempotente: só age quando rootAssuntoId é null.
  private async ensureRoot(userId: string, grafoId: string) {
    const g = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      select: { id: true, nome: true, rootAssuntoId: true },
    });
    if (!g || g.rootAssuntoId) return;
    await this.prisma.$transaction(async (tx) => {
      const root = await tx.assunto.create({ data: { nome: g.nome, usuarioId: userId } });
      await tx.nodeConhecimento.create({
        data: {
          usuarioId: userId,
          grafoId,
          tipoNode: 'ASSUNTO',
          referenciaId: root.id,
          posicaoX: 0,
          posicaoY: 0,
        },
      });
      await tx.grafosConhecimento.update({
        where: { id: grafoId },
        data: { rootAssuntoId: root.id },
      });
    });
  }

  // ---- Leitura do grafo (nós + arestas + posições) ----
  async loadGraph(userId: string, grafoId: string) {
    await this.ensureRoot(userId, grafoId);
    // posicaoX/posicaoY agora vêm direto do buildKnowledgeGraph — sem segunda query
    const { nodes, edges } = await buildKnowledgeGraph(this.prisma, userId, grafoId);
    return { nodes, edges };
  }

  // ---- Nós ----
  async createNode(userId: string, grafoId: string, input: CreateNodeInput) {
    const grafo = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
    });
    if (!grafo) throw new NotFoundException('Grafo não encontrado');
    const now = new Date();
    let entityId: string;
    switch (input.tipoNode) {
      case 'FLASHCARD':
        entityId = (
          await this.prisma.flashcard.create({
            data: {
              pergunta: input.pergunta ?? '',
              resposta: input.resposta ?? '',
              usuarioId: userId,
              dataCriacao: now,
            },
          })
        ).id;
        break;
      case 'NOTA': {
        const titulo = (input.titulo ?? '').trim();
        if (!titulo) throw new BadRequestException('O título da nota é obrigatório');
        if (!input.subtipo || !NOTA_SUBTIPOS.includes(input.subtipo))
          throw new BadRequestException('Selecione o subtipo da nota');
        if ((input.tipoNota ?? 'PERMANENTE') === 'LITERATURA' && !input.fonte?.trim())
          throw new BadRequestException('Notas de literatura exigem a fonte');
        entityId = (
          await this.prisma.nota.create({
            data: {
              titulo,
              tipoNota: input.tipoNota ?? 'PERMANENTE',
              subtipo: input.subtipo as any,
              fonte: input.fonte?.trim() || null,
              slug: notaSlug(titulo, now),
              conteudo: input.conteudo ?? '',
              usuarioId: userId,
              dataCriacao: now,
            },
          })
        ).id;
        break;
      }
      case 'TEXTO_BRUTO':
        if (!input.texto?.trim()) throw new BadRequestException('O texto original é obrigatório');
        entityId = (
          await this.prisma.textoBruto.create({
            data: {
              titulo: input.titulo?.trim() || 'Texto sem título',
              texto: input.texto.trim(),
              usuarioId: userId,
              dataCriacao: now,
            },
          })
        ).id;
        break;
      case 'ASSUNTO':
        entityId = (
          await this.prisma.assunto.create({
            data: { nome: input.nome ?? '', descricao: input.descricao ?? null, usuarioId: userId },
          })
        ).id;
        break;
      case 'TOPICO':
        entityId = (
          await this.prisma.topico.create({
            data: { nome: input.nome ?? '', descricao: input.descricao ?? null, usuarioId: userId },
          })
        ).id;
        break;
      case 'CONCEITO':
        entityId = (
          await this.prisma.conceito.create({
            data: { nome: input.nome ?? '', descricao: input.descricao ?? null, usuarioId: userId },
          })
        ).id;
        break;
      case 'BARALHO':
        entityId = (
          await this.prisma.baralho.create({
            data: {
              titulo: (input.titulo ?? input.nome ?? '').trim(),
              usuarioId: userId,
              dataCriacao: now,
            },
          })
        ).id;
        break;
      default:
        throw new BadRequestException(`Tipo de nó desconhecido: ${input.tipoNode}`);
    }
    await this.prisma.nodeConhecimento.create({
      data: {
        grafoId,
        tipoNode: input.tipoNode as any,
        referenciaId: entityId,
        usuarioId: userId,
        posicaoX: input.posicaoX ?? null,
        posicaoY: input.posicaoY ?? null,
        nivelDominio: input.nivelDominio ?? 0,
      },
    });
    return { nodeId: entityId };
  }

  async updateNode(
    userId: string,
    tipoNode: TipoNode,
    refId: string,
    data: Partial<CreateNodeInput>,
  ) {
    const where = { id: refId, usuarioId: userId };
    let count = 0;
    switch (tipoNode) {
      case 'ASSUNTO':
        count = (
          await this.prisma.assunto.updateMany({
            where,
            data: { nome: data.nome, descricao: data.descricao },
          })
        ).count;
        break;
      case 'TOPICO':
        count = (
          await this.prisma.topico.updateMany({
            where,
            data: { nome: data.nome, descricao: data.descricao },
          })
        ).count;
        break;
      case 'CONCEITO':
        count = (
          await this.prisma.conceito.updateMany({
            where,
            data: { nome: data.nome, descricao: data.descricao },
          })
        ).count;
        break;
      case 'FLASHCARD':
        count = (
          await this.prisma.flashcard.updateMany({
            where,
            data: { pergunta: data.pergunta, resposta: data.resposta },
          })
        ).count;
        break;
      case 'NOTA':
        if (data.subtipo && !NOTA_SUBTIPOS.includes(data.subtipo))
          throw new BadRequestException('Subtipo inválido');
        count = (
          await this.prisma.nota.updateMany({
            where,
            data: {
              titulo: data.titulo?.trim(),
              conteudo: data.conteudo,
              tipoNota: data.tipoNota,
              subtipo: data.subtipo as any,
              fonte: data.fonte === undefined ? undefined : data.fonte?.trim() || null,
            },
          })
        ).count;
        break;
      case 'TEXTO_BRUTO':
        count = (
          await this.prisma.textoBruto.updateMany({
            where,
            data: { titulo: data.titulo?.trim(), texto: data.texto?.trim() },
          })
        ).count;
        break;
      default:
        throw new BadRequestException(`Tipo de nó desconhecido: ${tipoNode}`);
    }
    if (count === 0) throw new NotFoundException('Nó não encontrado');
    return { success: true };
  }

  // ---- Arestas ----
  // Delegado ao CreateEdgeUseCase (usado pelo ai.service na geração por IA).
  async createEdge(
    userId: string,
    grafoId: string,
    input: { sourceNodeId: string; targetNodeId: string; tipoRelacao: string; peso?: number },
  ): Promise<{ edgeId: string }> {
    return this.createEdgeUseCase.execute({ userId, grafoId, ...input });
  }

  // ---- Itens existentes (não estão no grafo) para "Adicionar existentes" ----
  // flashcards do usuário (picker do baralho)
  // Exporta o grafo no MESMO formato do importGraph (ref = referenciaId),
  // com conteúdo completo + posição/nível. Usado pelo vault (Pull no desktop).
  async exportGraph(userId: string, grafoId: string) {
    const grafo = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
    });
    if (!grafo) throw new NotFoundException('Grafo não encontrado');
    const nodeRows = await this.prisma.nodeConhecimento.findMany({
      where: { grafoId, usuarioId: userId },
    });
    const nodes: Array<Record<string, unknown>> = [];
    for (const nr of nodeRows) {
      const d = await this.getNodeDetailsUseCase.execute(userId, nr.tipoNode, nr.referenciaId);
      if (!d) continue;
      nodes.push({
        ref: nr.referenciaId,
        tipo: nr.tipoNode,
        posicaoX: nr.posicaoX,
        posicaoY: nr.posicaoY,
        nivelDominio: nr.nivelDominio,
        ...d,
      });
    }
    const edgeRows = await this.getEdgesUseCase.execute(userId, grafoId);
    const edges = edgeRows.map((e) => ({
      origem: e.source,
      destino: e.target,
      relacao: e.tipoRelacao,
      peso: e.peso,
    }));
    return { grafo: { id: grafo.id, nome: grafo.nome }, nodes, edges };
  }

  // Sincroniza o grafo a partir do vault (Push do desktop): faz UPSERT por id
  // (atualiza conteúdo se existe, cria com o id dado se novo) e SUBSTITUI as
  // arestas do grafo pelas do vault. Nós cujo .md sumiu da pasta são REMOVIDOS
  // do grafo (desvincula o NodeConhecimento); a entidade e o SRS são preservados.
  // Guarda: se o vault vier sem nós, não remove nada (evita apagar tudo por engano).
  async syncGraphFromVault(
    userId: string,
    grafoId: string,
    payload: {
      nodes: Array<{
        ref: string;
        tipo: TipoNode;
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
      }>;
      edges: Array<{ origem: string; destino: string; relacao: string; peso?: number }>;
    },
  ) {
    const grafo = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
    });
    if (!grafo) throw new NotFoundException('Grafo não encontrado');
    const nodes = payload?.nodes ?? [];
    const edges = payload?.edges ?? [];
    const result = { created: 0, updated: 0, edges: 0, removed: 0 };

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // remove do grafo os nós cujo .md sumiu (só se o vault tiver nós)
      if (nodes.length > 0) {
        const vaultRefs = new Set(nodes.map((n) => n.ref));
        const current = await tx.nodeConhecimento.findMany({
          where: { grafoId, usuarioId: userId },
          select: { id: true, referenciaId: true },
        });
        const toRemove = current.filter((c) => !vaultRefs.has(c.referenciaId));
        if (toRemove.length) {
          const ids = toRemove.map((c) => c.id);
          await tx.conhecimentoAresta.deleteMany({
            where: { OR: [{ nodeOrigemId: { in: ids } }, { nodeDestinoId: { in: ids } }] },
          });
          await tx.desempenhoNo.deleteMany({ where: { nodeId: { in: ids } } });
          await tx.nodeConhecimento.deleteMany({ where: { id: { in: ids } } });
          result.removed = toRemove.length;
        }
      }

      for (const n of nodes) {
        await this.upsertEntityFromVault(tx, userId, n, now);
        const existing = await tx.nodeConhecimento.findFirst({
          where: { grafoId, referenciaId: n.ref, usuarioId: userId },
        });
        const nodeData = {
          posicaoX: n.posicaoX ?? 0,
          posicaoY: n.posicaoY ?? 0,
          nivelDominio: n.nivelDominio ?? 0,
        };
        if (existing) {
          await tx.nodeConhecimento.update({ where: { id: existing.id }, data: nodeData });
          result.updated++;
        } else {
          await tx.nodeConhecimento.create({
            data: {
              grafoId,
              tipoNode: n.tipo as any,
              referenciaId: n.ref,
              usuarioId: userId,
              ...nodeData,
            },
          });
          result.created++;
        }
      }

      // substitui as arestas do grafo pelas do vault (trata remoções de relação)
      const nodeRows = await tx.nodeConhecimento.findMany({
        where: { grafoId, usuarioId: userId },
        select: { id: true, referenciaId: true, tipoNode: true },
      });
      const byRef = new Map(nodeRows.map((r) => [r.referenciaId, r]));
      await tx.conhecimentoAresta.deleteMany({ where: { grafoId } });
      const seen = new Set<string>();
      for (const e of edges) {
        const s = byRef.get(e.origem);
        const t = byRef.get(e.destino);
        if (!s || !t || s.id === t.id) continue;
        if (!isRelationAllowed(s.tipoNode, t.tipoNode, e.relacao)) continue;
        const key = `${s.id}->${t.id}->${e.relacao}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const peso =
          e.peso !== undefined && Number.isFinite(e.peso) && e.peso > 0 && e.peso <= 2 ? e.peso : 1;
        await tx.conhecimentoAresta.create({
          data: {
            grafoId,
            nodeOrigemId: s.id,
            nodeDestinoId: t.id,
            tipoRelacao: e.relacao as any,
            peso,
          },
        });
        result.edges++;
      }

      // Sincroniza baralho_flashcards com as arestas CONTEM recém-criadas.
      // O vault exporta BARALHO→FLASHCARD como arestas do grafo, mas o serviço
      // de estudo lê a relação direta na tabela baralho_flashcards — por isso
      // é preciso mantê-las em sincronia após cada push do vault.
      const baralhoPairs = new Map<string, string[]>(); // baralhoRef → fcRefs[]
      for (const e of edges) {
        if (e.relacao !== 'CONTEM') continue;
        const s = byRef.get(e.origem);
        const t = byRef.get(e.destino);
        if (!s || !t) continue;
        if (s.tipoNode !== 'BARALHO' || t.tipoNode !== 'FLASHCARD') continue;
        const list = baralhoPairs.get(e.origem) ?? [];
        list.push(e.destino); // vault ref === entity id
        baralhoPairs.set(e.origem, list);
      }
      for (const [baralhoRef, fcRefs] of baralhoPairs) {
        await tx.baralho.update({
          where: { id: baralhoRef },
          data: { flashcards: { set: fcRefs.map((id) => ({ id })) } },
        });
      }
    });
    return result;
  }

  // upsert da entidade subjacente por id (= ref do vault), por tipo.
  private async upsertEntityFromVault(
    tx: any,
    userId: string,
    n: {
      ref: string;
      tipo: TipoNode;
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
    },
    now: Date,
  ) {
    const id = n.ref;
    switch (n.tipo) {
      case 'ASSUNTO':
      case 'TOPICO':
      case 'CONCEITO': {
        const model: any =
          n.tipo === 'ASSUNTO' ? tx.assunto : n.tipo === 'TOPICO' ? tx.topico : tx.conceito;
        const nome = (n.nome ?? '').trim() || 'Sem título';
        await model.upsert({
          where: { id },
          create: { id, nome, descricao: n.descricao ?? null, usuarioId: userId },
          update: { nome, descricao: n.descricao ?? null },
        });
        break;
      }
      case 'FLASHCARD': {
        const pergunta = (n.pergunta ?? '').trim();
        const resposta = (n.resposta ?? '').trim();
        await tx.flashcard.upsert({
          where: { id },
          create: { id, pergunta, resposta, usuarioId: userId, dataCriacao: now },
          update: { pergunta, resposta },
        });
        break;
      }
      case 'NOTA': {
        const titulo = (n.titulo ?? '').trim() || 'Sem título';
        const conteudo = n.conteudo ?? '';
        await tx.nota.upsert({
          where: { id },
          create: {
            id,
            titulo,
            conteudo,
            tipoNota: n.tipoNota || 'PERMANENTE',
            subtipo: n.subtipo ?? '',
            fonte: n.fonte ?? null,
            slug: `${id}`,
            usuarioId: userId,
            dataCriacao: now,
          },
          update: {
            titulo,
            conteudo,
            tipoNota: n.tipoNota || 'PERMANENTE',
            subtipo: n.subtipo ?? '',
            fonte: n.fonte ?? null,
          },
        });
        break;
      }
      case 'TEXTO_BRUTO': {
        const titulo = (n.titulo ?? '').trim() || 'Texto sem título';
        const texto = n.texto ?? '';
        await tx.textoBruto.upsert({
          where: { id },
          create: { id, titulo, texto, usuarioId: userId, dataCriacao: now },
          update: { titulo, texto },
        });
        break;
      }
      case 'BARALHO': {
        const titulo = (n.titulo ?? n.nome ?? '').trim() || 'Baralho';
        await tx.baralho.upsert({
          where: { id },
          create: { id, titulo, usuarioId: userId, dataCriacao: now },
          update: { titulo },
        });
        break;
      }
    }
  }

  // baralho para visualização (ViewDeckModal): todos os cards do deck
  // ---- Baralho ----
  async createBaralho(userId: string, grafoId: string, titulo: string, flashcardIds: string[]) {
    const grafo = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
    });
    if (!grafo) throw new NotFoundException('Grafo não encontrado');
    const tituloTrim = titulo?.trim();
    if (!tituloTrim) throw new BadRequestException('O título do baralho é obrigatório');
    const ids = Array.from(new Set(flashcardIds ?? []));
    if (ids.length > 1000) throw new BadRequestException('Máximo de 1000 flashcards por baralho');
    if (ids.length > 0) {
      const count = await this.prisma.flashcard.count({
        where: { id: { in: ids }, usuarioId: userId },
      });
      if (count !== ids.length)
        throw new BadRequestException('Um ou mais flashcards não pertencem ao usuário');
    }
    const now = new Date();
    const baralhoId = await this.prisma.$transaction(async (tx) => {
      const baralho = await tx.baralho.create({
        data: {
          titulo: tituloTrim,
          usuarioId: userId,
          dataCriacao: now,
          flashcards: ids.length ? { connect: ids.map((id) => ({ id })) } : undefined,
        },
      });
      const baralhoNode = await tx.nodeConhecimento.create({
        data: { grafoId, tipoNode: 'BARALHO', referenciaId: baralho.id, usuarioId: userId },
      });
      for (const fcId of ids) {
        let fcNode = await tx.nodeConhecimento.findFirst({
          where: { grafoId, usuarioId: userId, tipoNode: 'FLASHCARD', referenciaId: fcId },
          select: { id: true },
        });
        if (!fcNode)
          fcNode = await tx.nodeConhecimento.create({
            data: { grafoId, tipoNode: 'FLASHCARD', referenciaId: fcId, usuarioId: userId },
            select: { id: true },
          });
        await tx.conhecimentoAresta.create({
          data: {
            grafoId,
            nodeOrigemId: baralhoNode.id,
            nodeDestinoId: fcNode.id,
            tipoRelacao: 'CONTEM',
            peso: 1,
          },
        });
      }
      return baralho.id;
    });
    return { success: true, nodeId: baralhoId };
  }

  // ---- Prova: vincula (ou cria e vincula) uma prova ao grafo ----
  async addProvaToGraph(userId: string, grafoId: string, provaId: string) {
    const grafo = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
    });
    if (!grafo) throw new NotFoundException('Grafo não encontrado');
    const prova = await (this.prisma as any).prova.findFirst({
      where: { id: provaId, usuarioId: userId },
    });
    if (!prova) throw new NotFoundException('Prova não encontrada');
    const existing = await this.prisma.nodeConhecimento.findFirst({
      where: { grafoId, tipoNode: 'PROVA' as any, referenciaId: provaId },
    });
    if (existing) return { success: true, nodeId: existing.id };
    const node = await this.prisma.nodeConhecimento.create({
      data: { grafoId, tipoNode: 'PROVA' as any, referenciaId: provaId, usuarioId: userId },
    });
    return { success: true, nodeId: node.id };
  }

  // ---- Import JSON (nós + arestas, com reuso por nome) ----
  importGraph(userId: string, grafoId: string, payload: ImportGraphPayload) {
    return runImportGraph(this.prisma, userId, grafoId, payload);
  }

  // ---- Busca por conteúdo (devolve refIds que casam) ----
  // ---- Posições ----
  // ---- Subgrafos ----

  async createSubgrafo(
    userId: string,
    parentGrafoId: string,
    input: { nome: string; descricao?: string; tipoRelacao: string; posX?: number; posY?: number },
  ) {
    const parent = await this.prisma.grafosConhecimento.findFirst({
      where: { id: parentGrafoId, usuarioId: userId },
    });
    if (!parent) throw new NotFoundException('Grafo pai não encontrado');
    if (!GRAFO_REF_RELATIONS.includes(input.tipoRelacao as any))
      throw new BadRequestException('Tipo de relação inválido para subgrafo');

    return this.prisma.$transaction(async (tx) => {
      const filho = await tx.grafosConhecimento.create({
        data: {
          usuarioId: userId,
          nome: input.nome.trim() || 'Novo subgrafo',
          descricao: input.descricao ?? null,
          parentGrafoId,
          tipoRelacaoPai: input.tipoRelacao,
        },
      });
      const refNode = await tx.nodeConhecimento.create({
        data: {
          grafoId: parentGrafoId,
          tipoNode: 'GRAFO_REF',
          referenciaId: filho.id,
          usuarioId: userId,
          posicaoX: input.posX ?? 0,
          posicaoY: input.posY ?? 0,
        },
      });
      return { grafoId: filho.id, grafoRefNodeId: refNode.referenciaId };
    });
  }

  async extractNodesToSubgrafo(
    userId: string,
    parentGrafoId: string,
    input: { nodeIds: string[]; nome: string; tipoRelacao: string },
  ) {
    if (!input.nodeIds.length)
      throw new BadRequestException('Selecione ao menos um nó para extrair');
    if (!GRAFO_REF_RELATIONS.includes(input.tipoRelacao as any))
      throw new BadRequestException('Tipo de relação inválido');

    const parent = await this.prisma.grafosConhecimento.findFirst({
      where: { id: parentGrafoId, usuarioId: userId },
    });
    if (!parent) throw new NotFoundException('Grafo pai não encontrado');

    const nodeRows = await this.prisma.nodeConhecimento.findMany({
      where: { grafoId: parentGrafoId, usuarioId: userId, referenciaId: { in: input.nodeIds } },
    });
    if (nodeRows.length === 0) throw new BadRequestException('Nenhum nó válido encontrado');

    const nodeRowIds = nodeRows.map((n) => n.id);
    const nodeRefIds = new Set(nodeRows.map((n) => n.referenciaId));

    // Calcular centróide para posição do GRAFO_REF
    const centX = nodeRows.reduce((s, n) => s + (n.posicaoX ?? 0), 0) / nodeRows.length;
    const centY = nodeRows.reduce((s, n) => s + (n.posicaoY ?? 0), 0) / nodeRows.length;

    // Arestas externas: uma ponta dentro, outra fora
    const allEdges = await this.prisma.conhecimentoAresta.findMany({
      where: {
        grafoId: parentGrafoId,
        OR: [{ nodeOrigemId: { in: nodeRowIds } }, { nodeDestinoId: { in: nodeRowIds } }],
      },
    });
    const internalEdgeIds = allEdges
      .filter(
        (e) =>
          nodeRowIds.includes(e.nodeOrigemId ?? '') && nodeRowIds.includes(e.nodeDestinoId ?? ''),
      )
      .map((e) => e.id);
    const externalEdges = allEdges.filter((e) => !internalEdgeIds.includes(e.id));

    return this.prisma.$transaction(async (tx) => {
      const filho = await tx.grafosConhecimento.create({
        data: {
          usuarioId: userId,
          nome: input.nome.trim(),
          descricao: null,
          parentGrafoId,
          tipoRelacaoPai: input.tipoRelacao,
        },
      });

      // Move nós para o filho
      await tx.nodeConhecimento.updateMany({
        where: { id: { in: nodeRowIds } },
        data: { grafoId: filho.id },
      });

      // Cria GRAFO_REF no pai
      const refNode = await tx.nodeConhecimento.create({
        data: {
          grafoId: parentGrafoId,
          tipoNode: 'GRAFO_REF',
          referenciaId: filho.id,
          usuarioId: userId,
          posicaoX: centX,
          posicaoY: centY,
        },
      });

      // Redireciona arestas externas para o GRAFO_REF
      let rewiredEdgeCount = 0;
      for (const edge of externalEdges) {
        const srcIn = nodeRowIds.includes(edge.nodeOrigemId ?? '');
        const tgtIn = nodeRowIds.includes(edge.nodeDestinoId ?? '');
        await tx.conhecimentoAresta.update({
          where: { id: edge.id },
          data: {
            nodeOrigemId: srcIn ? refNode.id : edge.nodeOrigemId,
            nodeDestinoId: tgtIn ? refNode.id : edge.nodeDestinoId,
          },
        });
        rewiredEdgeCount++;
      }

      return {
        grafoId: filho.id,
        grafoRefNodeId: filho.id,
        movedCount: nodeRows.length,
        rewiredEdgeCount,
      };
    });
  }

  async expandSubgrafo(userId: string, childGrafoId: string) {
    const child = await this.prisma.grafosConhecimento.findFirst({
      where: { id: childGrafoId, usuarioId: userId },
    });
    if (!child) throw new NotFoundException('Subgrafo não encontrado');
    return this.loadGraph(userId, childGrafoId);
  }
}
