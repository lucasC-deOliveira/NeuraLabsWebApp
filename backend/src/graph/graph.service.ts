import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isRelationAllowed } from '../modules/graph/domain/services/relation-rules';
import { CreateEdgeUseCase } from '../modules/graph/application/use-cases/create-edge.use-case';
import { CreateNodeUseCase } from '../modules/graph/application/use-cases/create-node.use-case';
import { CreateDeckUseCase } from '../modules/graph/application/use-cases/create-deck.use-case';

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

@Injectable()
export class GraphService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createEdgeUseCase: CreateEdgeUseCase,
    private readonly createNodeUseCase: CreateNodeUseCase,
    private readonly createDeckUseCase: CreateDeckUseCase,
  ) {}

  // ---- Nós ----
  // Delegado ao CreateNodeUseCase (usado pelo ai.service na geração por IA).
  async createNode(userId: string, grafoId: string, input: CreateNodeInput) {
    return this.createNodeUseCase.execute(userId, grafoId, input);
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
  // Delegado ao CreateDeckUseCase (usado pelo ai.service na geração por IA).
  async createBaralho(userId: string, grafoId: string, titulo: string, flashcardIds: string[]) {
    return this.createDeckUseCase.execute(userId, grafoId, titulo, flashcardIds);
  }
}
