import { Injectable } from '@nestjs/common';
import { type Prisma, type SubtipoNota, type TipoNode, type TipoRelacao } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  VaultPayload,
  VaultSyncRepository,
  VaultSyncResult,
} from '../../domain/ports/vault-sync-repository';
import {
  baralhoFlashcardPairs,
  planVaultEdges,
  refsToRemove,
  type GraphNodeRef,
  type PlannedEdge,
  type VaultNode,
} from '../../domain/services/vault-sync';
import { containNode, createContainedNode } from './node-containment';

type Tx = Prisma.TransactionClient;
type EntityUpserter = (tx: Tx, userId: string, n: VaultNode, now: Date) => Promise<void>;

const structuralFields = (n: VaultNode): { nome: string; descricao: string | null } => ({
  nome: (n.nome ?? '').trim() || 'Sem título',
  descricao: n.descricao ?? null,
});

const linkData = (n: VaultNode): { posicaoX: number; posicaoY: number; nivelDominio: number } => ({
  posicaoX: n.posicaoX ?? 0,
  posicaoY: n.posicaoY ?? 0,
  nivelDominio: n.nivelDominio ?? 0,
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
      return { created, updated, edges: edgeCount, removed };
    });
  }

  // Unlinks graph nodes whose entity vanished from the vault (only when the vault
  // carries nodes — an empty payload removes nothing, as a safety guard).
  private async removeMissing(
    tx: Tx,
    userId: string,
    grafoId: string,
    nodes: VaultNode[],
  ): Promise<number> {
    if (nodes.length === 0) return 0;
    const vaultRefs = new Set(nodes.map((n) => n.ref));
    const current = await tx.nodeConhecimento.findMany({
      where: { grafoId, usuarioId: userId },
      select: { id: true, referenciaId: true },
    });
    const ids = refsToRemove(current, vaultRefs);
    if (ids.length) await this.deleteNodeLinks(tx, ids);
    return ids.length;
  }

  private async deleteNodeLinks(tx: Tx, ids: string[]): Promise<void> {
    await tx.conhecimentoAresta.deleteMany({
      where: { OR: [{ nodeOrigemId: { in: ids } }, { nodeDestinoId: { in: ids } }] },
    });
    await tx.desempenhoNo.deleteMany({ where: { nodeId: { in: ids } } });
    await tx.nodeConhecimento.deleteMany({ where: { id: { in: ids } } });
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
      where: { grafoId, referenciaId: n.ref, usuarioId: userId },
      select: { id: true },
    });
    if (existing) {
      await tx.nodeConhecimento.update({ where: { id: existing.id }, data: linkData(n) });
      await containNode(tx, grafoId, existing.id);
      return true;
    }
    await this.createNodeLink(tx, userId, grafoId, n);
    return false;
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
    });
  }

  private async loadByRef(
    tx: Tx,
    userId: string,
    grafoId: string,
  ): Promise<Map<string, GraphNodeRef>> {
    const rows = await tx.nodeConhecimento.findMany({
      where: { grafoId, usuarioId: userId },
      select: { id: true, referenciaId: true, tipoNode: true },
    });
    return new Map(rows.map((r) => [r.referenciaId, r]));
  }

  // Replaces all edges of the graph with the validated vault edges.
  private async replaceEdges(
    tx: Tx,
    grafoId: string,
    edges: VaultPayload['edges'],
    byRef: Map<string, GraphNodeRef>,
  ): Promise<number> {
    await tx.conhecimentoAresta.deleteMany({ where: { grafoId } });
    const planned = planVaultEdges(edges, byRef);
    for (const e of planned) await this.createEdge(tx, grafoId, e);
    return planned.length;
  }

  private createEdge(tx: Tx, grafoId: string, e: PlannedEdge): Promise<unknown> {
    return tx.conhecimentoAresta.create({
      data: {
        grafoId,
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
