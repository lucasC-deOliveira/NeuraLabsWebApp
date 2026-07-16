import { Prisma, PrismaClient, TipoNode } from '@prisma/client';

// Escrita da contenção grafo↔nó, num lugar só.
//
// Todo ponto que cria nó precisa também dizer QUE GRAFO o mostra — são 11 pontos
// espalhados por 4 módulos. Se cada um fizer isso à mão, um dia alguém esquece e o
// nó nasce invisível na vista (que lê por grafo_nodes desde a fase 2). Por isso
// existe esta função: quem cria nó chama daqui.
//
// O nó não guarda mais o grafo: quem diz que ele está lá é a contenção. Reusar um
// nó que já existe é o normal, não a exceção — é o ponto de ele ser do sistema.

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
 * Garante o nó da entidade e faz o grafo contê-lo. Devolve o id da linha do nó.
 *
 * O nó é único por (usuário, tipo, referência): se a entidade já tem nó — porque
 * outro grafo a mostra —, ele é REUSADO, e o grafo só passa a contê-lo. Era aqui
 * que nascia a duplicata, quando cada grafo precisava do seu clone.
 * @example createContainedNode(tx, { usuarioId, grafoId, tipoNode: 'CONCEITO', referenciaId })
 */
export async function createContainedNode(db: Db, input: ContainedNodeInput): Promise<string> {
  const identidade = {
    usuarioId: input.usuarioId,
    tipoNode: input.tipoNode,
    referenciaId: input.referenciaId,
  };
  const node = await db.nodeConhecimento.upsert({
    where: { _node_unique: identidade },
    create: { ...identidade, nivelDominio: input.nivelDominio ?? 0 },
    update: {},
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

/**
 * Filtro `where` das arestas que um grafo MOSTRA: as duas pontas contidas nele. A
 * aresta liga nós e não pertence a vista nenhuma — quem a exibe é quem tem os dois
 * lados. Repetido em meia dúzia de repositórios; mora aqui para ser a mesma
 * pergunta em todos.
 * @example prisma.conhecimentoAresta.findMany({ where: edgesOfGraph(grafoId) })
 */
export function edgesOfGraph(grafoId: string): {
  nodeOrigem: { contidoEm: { some: { grafoId: string } } };
  nodeDestino: { contidoEm: { some: { grafoId: string } } };
} {
  const contido = { contidoEm: { some: { grafoId } } };
  return { nodeOrigem: contido, nodeDestino: contido };
}
