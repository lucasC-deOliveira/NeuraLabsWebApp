import { Prisma, PrismaClient, TipoNode } from '@prisma/client';

// Escrita da contenção grafo↔nó, num lugar só.
//
// Todo ponto que cria nó precisa também dizer QUE GRAFO o mostra — são 11 pontos
// espalhados por 4 módulos. Se cada um fizer isso à mão, um dia alguém esquece e o
// nó nasce invisível na vista (que lê por grafo_nodes desde a fase 2). Por isso
// existe esta função: quem cria nó chama daqui.
//
// Migração: escreve nos DOIS modelos — a coluna id_grafo do nó (fonte da verdade
// antiga, ainda lida por importância/roadmap/deleção) e grafo_nodes (a nova, já
// lida pela vista). O id_grafo do nó sai na fase 5, e aí esta função só grava a
// contenção.

// Os chamadores estão dentro e fora de transação; ambos servem.
type Db = PrismaClient | Prisma.TransactionClient;

export interface ContainedNodeInput {
  usuarioId: string;
  grafoId: string;
  tipoNode: TipoNode;
  referenciaId: string;
  posicaoX?: number | null;
  posicaoY?: number | null;
  nivelDominio?: number;
}

/**
 * Cria o nó e faz o grafo contê-lo. Devolve o id da linha do nó.
 * @example createContainedNode(tx, { usuarioId, grafoId, tipoNode: 'CONCEITO', referenciaId })
 */
export async function createContainedNode(db: Db, input: ContainedNodeInput): Promise<string> {
  const node = await db.nodeConhecimento.create({
    data: {
      usuarioId: input.usuarioId,
      grafoId: input.grafoId,
      tipoNode: input.tipoNode,
      referenciaId: input.referenciaId,
      posicaoX: input.posicaoX ?? 0,
      posicaoY: input.posicaoY ?? 0,
      nivelDominio: input.nivelDominio ?? 0,
    },
    select: { id: true },
  });
  await containNode(db, input.grafoId, node.id, input.posicaoX, input.posicaoY);
  return node.id;
}

/**
 * Faz o grafo conter um nó que já existe. Idempotente: conter duas vezes não é
 * erro, é o mesmo fato dito de novo.
 * @example containNode(tx, grafoId, nodeId, 100, 200)
 */
export async function containNode(
  db: Db,
  grafoId: string,
  nodeId: string,
  posicaoX?: number | null,
  posicaoY?: number | null,
): Promise<void> {
  await db.grafoNode.upsert({
    where: { grafoId_nodeId: { grafoId, nodeId } },
    create: { grafoId, nodeId, posicaoX: posicaoX ?? 0, posicaoY: posicaoY ?? 0 },
    update: {},
  });
}

/** Tira o nó da vista de um grafo. A entidade e o nó continuam existindo. */
export async function releaseNode(db: Db, grafoId: string, nodeId: string): Promise<void> {
  await db.grafoNode.deleteMany({ where: { grafoId, nodeId } });
}
