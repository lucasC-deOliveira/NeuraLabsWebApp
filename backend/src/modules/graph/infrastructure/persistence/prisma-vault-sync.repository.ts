import { Injectable } from '@nestjs/common';
import {
  type Prisma,
  type SubtipoNota,
  type TipoNode,
  type TipoQuestao,
  type TipoRelacao,
} from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  VaultPayload,
  VaultSyncRepository,
  VaultSyncResult,
} from '../../domain/ports/vault-sync-repository';
import {
  baralhoFlashcardPairs,
  planProvaQuestoes,
  planVaultEdges,
  provaQuestaoPairs,
  refsToRemove,
  type GraphNodeRef,
  type PlannedEdge,
  type VaultNode,
} from '../../domain/services/vault-sync';
import { containNode, createContainedNode, releaseNode } from './node-containment';

type Tx = Prisma.TransactionClient;
type EntityUpserter = (tx: Tx, userId: string, n: VaultNode, now: Date) => Promise<void>;

const structuralFields = (n: VaultNode): { nome: string; descricao: string | null } => ({
  nome: (n.nome ?? '').trim() || 'Sem título',
  descricao: n.descricao ?? null,
});

interface LinkData {
  posicaoX: number;
  posicaoY: number;
  nivelDominio: number;
  // `null` apaga o peso; `undefined` (campo ausente no .md) preserva o que existe.
  pesoEdital: number | null | undefined;
}

const linkData = (n: VaultNode): LinkData => ({
  posicaoX: n.posicaoX ?? 0,
  posicaoY: n.posicaoY ?? 0,
  nivelDominio: n.nivelDominio ?? 0,
  pesoEdital: n.pesoEdital,
});

const TIPOS_QUESTAO: readonly string[] = ['VERDADEIRO_FALSO', 'MULTIPLA_ESCOLHA'];

// The column has no default and the .md is hand-edited, so an unknown (or absent)
// value is coerced to the common case instead of failing the whole Push.
const questaoTipo = (tipo?: string): TipoQuestao =>
  tipo && TIPOS_QUESTAO.includes(tipo) ? (tipo as TipoQuestao) : 'MULTIPLA_ESCOLHA';

const questaoFields = (n: VaultNode): Prisma.QuestaoUncheckedUpdateInput => ({
  enunciado: (n.enunciado ?? '').trim(),
  alternativas: (n.alternativas ?? []) as unknown as Prisma.InputJsonValue,
  gabarito: (n.gabarito ?? '').trim(),
  explicacao: n.explicacao ?? null,
  tipo: questaoTipo(n.tipoQuestao),
});

@Injectable()
export class PrismaVaultSyncRepository implements VaultSyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  async graphExists(grafoId: string, userId: string): Promise<boolean> {
    const g = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      select: { id: true },
    });
    return g !== null;
  }

  async syncFromVault(
    userId: string,
    grafoId: string,
    payload: VaultPayload,
  ): Promise<VaultSyncResult> {
    const nodes = payload?.nodes ?? [];
    const edges = payload?.edges ?? [];
    return this.prisma.$transaction(async (tx) => {
      const removed = await this.removeMissing(tx, userId, grafoId, nodes);
      const { created, updated } = await this.upsertNodes(tx, userId, grafoId, nodes);
      const byRef = await this.loadByRef(tx, userId, grafoId);
      const edgeCount = await this.replaceEdges(tx, grafoId, edges, byRef);
      await this.syncDecks(tx, edges, byRef);
      await this.syncProvas(tx, edges, byRef);
      return { created, updated, edges: edgeCount, removed };
    });
  }

  // Tira da VISTA os nós que sumiram da pasta (só quando a pasta traz nós — payload
  // vazio não remove nada, como salvaguarda).
  //
  // "Sumiu da pasta" quer dizer "não está mais NESTE grafo", nunca "deixou de
  // existir". Antes isto apagava a linha do nó e as arestas dele: com o nó do
  // sistema, apagar um .md de uma pasta destruiria o card em todos os outros
  // grafos. Agora só solta a contenção — a entidade, o nó e as arestas ficam.
  private async removeMissing(
    tx: Tx,
    userId: string,
    grafoId: string,
    nodes: VaultNode[],
  ): Promise<number> {
    if (nodes.length === 0) return 0;
    const vaultRefs = new Set(nodes.map((n) => n.ref));
    const current = await tx.nodeConhecimento.findMany({
      where: { usuarioId: userId, contidoEm: { some: { grafoId } } },
      select: { id: true, referenciaId: true },
    });
    const ids = refsToRemove(current, vaultRefs);
    for (const nodeId of ids) await releaseNode(tx, grafoId, nodeId);
    return ids.length;
  }

  private async upsertNodes(
    tx: Tx,
    userId: string,
    grafoId: string,
    nodes: VaultNode[],
  ): Promise<{ created: number; updated: number }> {
    const now = new Date();
    let created = 0;
    let updated = 0;
    for (const n of nodes) {
      await this.upsertEntity(tx, userId, n, now);
      if (await this.upsertNodeLink(tx, userId, grafoId, n)) updated++;
      else created++;
    }
    return { created, updated };
  }

  // Returns true when an existing link was updated, false when a new one was created.
  private async upsertNodeLink(
    tx: Tx,
    userId: string,
    grafoId: string,
    n: VaultNode,
  ): Promise<boolean> {
    const existing = await tx.nodeConhecimento.findFirst({
      where: { referenciaId: n.ref, usuarioId: userId, contidoEm: { some: { grafoId } } },
      select: { id: true },
    });
    if (!existing) {
      await this.createNodeLink(tx, userId, grafoId, n);
      return false;
    }
    await this.updateNodeLink(tx, grafoId, existing.id, n);
    return true;
  }

  private async updateNodeLink(
    tx: Tx,
    grafoId: string,
    nodeId: string,
    n: VaultNode,
  ): Promise<void> {
    const dados = linkData(n);
    // O nó guarda o domínio (é do usuário); a posição do .md é desta vista.
    await tx.nodeConhecimento.update({
      where: { id: nodeId },
      data: { nivelDominio: dados.nivelDominio },
    });
    await containNode(tx, grafoId, nodeId, dados.posicaoX, dados.posicaoY, dados.pesoEdital);
  }

  private async createNodeLink(
    tx: Tx,
    userId: string,
    grafoId: string,
    n: VaultNode,
  ): Promise<void> {
    const dados = linkData(n);
    await createContainedNode(tx, {
      usuarioId: userId,
      grafoId,
      tipoNode: n.tipo as TipoNode,
      referenciaId: n.ref,
      posicaoX: dados.posicaoX,
      posicaoY: dados.posicaoY,
      nivelDominio: dados.nivelDominio,
      pesoEdital: dados.pesoEdital,
    });
  }

  private async loadByRef(
    tx: Tx,
    userId: string,
    grafoId: string,
  ): Promise<Map<string, GraphNodeRef>> {
    const rows = await tx.nodeConhecimento.findMany({
      where: { usuarioId: userId, contidoEm: { some: { grafoId } } },
      select: { id: true, referenciaId: true, tipoNode: true },
    });
    return new Map(rows.map((r) => [r.referenciaId, r]));
  }

  /**
   * Troca as arestas DESTA VISTA pelas da pasta.
   *
   * Antes: `deleteMany({ where: { grafoId } })` — a aresta pertencia ao grafo.
   * Agora a aresta é um fato entre entidades, e a vista é só quem o exibe: só as
   * arestas entre nós que ESTE grafo contém são reconciliadas. Sem isso, um Push
   * apagaria arestas de outros grafos.
   *
   * Consequência assumida: uma aresta entre dois nós que também vivem em outro
   * grafo é um fato só. Removê-la aqui a remove de lá também — porque é a mesma
   * aresta, não uma cópia.
   */
  private async replaceEdges(
    tx: Tx,
    grafoId: string,
    edges: VaultPayload['edges'],
    byRef: Map<string, GraphNodeRef>,
  ): Promise<number> {
    const contido = { some: { grafoId } };
    await tx.conhecimentoAresta.deleteMany({
      where: { nodeOrigem: { contidoEm: contido }, nodeDestino: { contidoEm: contido } },
    });
    const planned = planVaultEdges(edges, byRef);
    for (const e of planned) await this.createEdge(tx, grafoId, e);
    return planned.length;
  }

  private createEdge(tx: Tx, grafoId: string, e: PlannedEdge): Promise<unknown> {
    return tx.conhecimentoAresta.create({
      data: {
        nodeOrigemId: e.nodeOrigemId,
        nodeDestinoId: e.nodeDestinoId,
        tipoRelacao: e.relacao as TipoRelacao,
        peso: e.peso,
      },
    });
  }

  private async syncDecks(
    tx: Tx,
    edges: VaultPayload['edges'],
    byRef: Map<string, GraphNodeRef>,
  ): Promise<void> {
    for (const { baralhoRef, fcRefs } of baralhoFlashcardPairs(edges, byRef)) {
      await tx.baralho.update({
        where: { id: baralhoRef },
        data: { flashcards: { set: fcRefs.map((id) => ({ id })) } },
      });
    }
  }

  /**
   * Mirrors syncDecks for exams. provas_questoes is an explicit join table with
   * an `ordem` the vault does not carry, so the rows are rebuilt from the CONTEM
   * edges while planProvaQuestoes preserves the order of the questions that were
   * already there.
   */
  private async syncProvas(
    tx: Tx,
    edges: VaultPayload['edges'],
    byRef: Map<string, GraphNodeRef>,
  ): Promise<void> {
    for (const { provaRef, questaoRefs } of provaQuestaoPairs(edges, byRef)) {
      const atuais = await tx.provaQuestao.findMany({
        where: { provaId: provaRef },
        select: { questaoId: true, ordem: true },
      });
      await tx.provaQuestao.deleteMany({ where: { provaId: provaRef } });
      const linhas = planProvaQuestoes(questaoRefs, atuais);
      await tx.provaQuestao.createMany({
        data: linhas.map((l) => ({ provaId: provaRef, ...l })),
      });
    }
  }

  private upsertEntity(tx: Tx, userId: string, n: VaultNode, now: Date): Promise<void> {
    const upsert = this.entityUpserters[n.tipo];
    return upsert ? upsert(tx, userId, n, now) : Promise.resolve();
  }

  // Upsert by id (= vault ref), per type, preserving the existing SRS/identity.
  private readonly entityUpserters: Record<string, EntityUpserter> = {
    ASSUNTO: async (tx, userId, n) => {
      await tx.assunto.upsert({
        where: { id: n.ref },
        create: { id: n.ref, ...structuralFields(n), usuarioId: userId },
        update: structuralFields(n),
      });
    },
    TOPICO: async (tx, userId, n) => {
      await tx.topico.upsert({
        where: { id: n.ref },
        create: { id: n.ref, ...structuralFields(n), usuarioId: userId },
        update: structuralFields(n),
      });
    },
    CONCEITO: async (tx, userId, n) => {
      await tx.conceito.upsert({
        where: { id: n.ref },
        create: { id: n.ref, ...structuralFields(n), usuarioId: userId },
        update: structuralFields(n),
      });
    },
    FLASHCARD: async (tx, userId, n, now) => {
      const data = { pergunta: (n.pergunta ?? '').trim(), resposta: (n.resposta ?? '').trim() };
      await tx.flashcard.upsert({
        where: { id: n.ref },
        create: { id: n.ref, ...data, usuarioId: userId, dataCriacao: now },
        update: data,
      });
    },
    NOTA: async (tx, userId, n, now) => this.upsertNota(tx, userId, n, now),
    TEXTO_BRUTO: async (tx, userId, n, now) => {
      const titulo = (n.titulo ?? '').trim() || 'Texto sem título';
      const data = { titulo, texto: n.texto ?? '' };
      await tx.textoBruto.upsert({
        where: { id: n.ref },
        create: { id: n.ref, ...data, usuarioId: userId, dataCriacao: now },
        update: data,
      });
    },
    BARALHO: async (tx, userId, n, now) => {
      const titulo = (n.titulo ?? n.nome ?? '').trim() || 'Baralho';
      await tx.baralho.upsert({
        where: { id: n.ref },
        create: { id: n.ref, titulo, usuarioId: userId, dataCriacao: now },
        update: { titulo },
      });
    },
    // Upserting by id (= the vault ref) keeps the attempts and answers already
    // recorded against the question, the way the flashcard one keeps the SRS.
    QUESTION: async (tx, userId, n, now) => {
      const data = questaoFields(n);
      await tx.questao.upsert({
        where: { id: n.ref },
        create: {
          id: n.ref,
          ...(data as Prisma.QuestaoUncheckedCreateInput),
          usuarioId: userId,
          dataCriacao: now,
        },
        update: data,
      });
    },
    PROVA: async (tx, userId, n, now) => {
      const data = {
        titulo: (n.titulo ?? n.nome ?? '').trim() || 'Prova',
        descricao: n.descricao ?? null,
      };
      await tx.prova.upsert({
        where: { id: n.ref },
        create: { id: n.ref, ...data, usuarioId: userId, dataCriacao: now },
        update: data,
      });
    },
  };

  private async upsertNota(tx: Tx, userId: string, n: VaultNode, now: Date): Promise<void> {
    const shared = {
      titulo: (n.titulo ?? '').trim() || 'Sem título',
      conteudo: n.conteudo ?? '',
      tipoNota: n.tipoNota || 'PERMANENTE',
      subtipo: (n.subtipo ?? '') as SubtipoNota,
      fonte: n.fonte ?? null,
    };
    await tx.nota.upsert({
      where: { id: n.ref },
      create: { id: n.ref, ...shared, slug: n.ref, usuarioId: userId, dataCriacao: now },
      update: shared,
    });
  }
}
