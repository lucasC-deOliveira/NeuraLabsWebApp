import { Injectable } from '@nestjs/common';
import { TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { ConceptTag } from '../../domain/curriculum-views';
import { nodeEdgePairs, conceptTagsByOwner } from '../../domain/services/connected-concepts';
import {
  parentsByConceito,
  NO_PARENTS,
  type ConceptParents,
  type NamedEntity,
  type ParentMaps,
} from '../../domain/services/concept-parents';

// Leitor dos conceitos que uma entidade tem NO GRAFO — hoje flashcards e questões.
// Vive no curriculum (shared kernel) porque vários contextos precisam: a listagem de
// flashcards, o baralho aberto e a lista de questões mostram as mesmas tags. As
// consultas ficam aqui; a combinação dos mapas é pura, em domain/services.

// Os pais vêm das arestas PERTENCE_A do grafo, não de Conceito.topicoId: na prática
// essas FKs ficam nulas (1 de 533 conceitos as tem preenchidas) e a hierarquia real
// é a do grafo — CONCEITO → TOPICO → ASSUNTO.
const PERTENCE_A = 'PERTENCE_A';

function conceptTagOf(nome: string, parents: ConceptParents): ConceptTag {
  return { conceito: nome, ...parents };
}

@Injectable()
export class PrismaConnectedConceptsQuery {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Conceitos ligados a cada flashcard via arestas do grafo.
   * @example connected.forFlashcards('u1', ['fc1']) // Map { fc1 => [tag, tag] }
   */
  forFlashcards(userId: string, flashcardIds: string[]): Promise<Map<string, ConceptTag[]>> {
    return this.forNodes(userId, TipoNode.FLASHCARD, flashcardIds);
  }

  /**
   * Conceitos que cada questão testa, via arestas do grafo.
   * @example connected.forQuestions('u1', ['q1']) // Map { q1 => [tag] }
   */
  forQuestions(userId: string, questaoIds: string[]): Promise<Map<string, ConceptTag[]>> {
    return this.forNodes(userId, TipoNode.QUESTION, questaoIds);
  }

  // O caminho é o mesmo para qualquer dono (flashcard, questão): achar os nós dele,
  // olhar as arestas incidentes e ficar com as que chegam num CONCEITO.
  private async forNodes(
    userId: string,
    tipo: TipoNode,
    refIds: string[],
  ): Promise<Map<string, ConceptTag[]>> {
    if (refIds.length === 0) return new Map();
    const nodeToOwner = await this.ownerNodes(userId, tipo, refIds);
    if (nodeToOwner.size === 0) return new Map();
    const edges = await this.incidentEdges([...nodeToOwner.keys()]);
    const pairs = nodeEdgePairs(edges, new Set(nodeToOwner.keys()));
    const conceptNodeToId = await this.conceptNodes(
      userId,
      pairs.map((p) => p.other),
    );
    const tagByConcept = await this.conceptTags(userId, conceptNodeToId);
    return conceptTagsByOwner(pairs, nodeToOwner, conceptNodeToId, tagByConcept);
  }

  // Nós do usuário para as entidades dadas → mapa nodeId → referenciaId.
  private async ownerNodes(
    userId: string,
    tipo: TipoNode,
    ids: string[],
  ): Promise<Map<string, string>> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, tipoNode: tipo, referenciaId: { in: ids } },
      select: { id: true, referenciaId: true },
    });
    return new Map(nodes.map((n) => [n.id, n.referenciaId]));
  }

  private async incidentEdges(
    nodeIds: string[],
  ): Promise<{ nodeOrigemId: string | null; nodeDestinoId: string | null }[]> {
    return this.prisma.conhecimentoAresta.findMany({
      where: { OR: [{ nodeOrigemId: { in: nodeIds } }, { nodeDestinoId: { in: nodeIds } }] },
      select: { nodeOrigemId: true, nodeDestinoId: true },
    });
  }

  // Entre os nós do outro lado das arestas, os que são CONCEITO → mapa nodeId → conceitoId.
  private async conceptNodes(userId: string, nodeIds: string[]): Promise<Map<string, string>> {
    if (nodeIds.length === 0) return new Map();
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, tipoNode: TipoNode.CONCEITO, id: { in: nodeIds } },
      select: { id: true, referenciaId: true },
    });
    return new Map(nodes.map((n) => [n.id, n.referenciaId]));
  }

  // Resolve cada conceito para sua tag (nome + tópico/assunto pais, vindos do grafo).
  private async conceptTags(
    userId: string,
    conceptNodeToId: Map<string, string>,
  ): Promise<Map<string, ConceptTag>> {
    const ids = [...new Set(conceptNodeToId.values())];
    if (ids.length === 0) return new Map();
    const conceitos = await this.prisma.conceito.findMany({
      where: { usuarioId: userId, id: { in: ids } },
      select: { id: true, nome: true },
    });
    const parents = parentsByConceito(conceptNodeToId, await this.parentMaps(conceptNodeToId));
    return new Map(
      conceitos.map((c) => [c.id, conceptTagOf(c.nome, parents.get(c.id) ?? NO_PARENTS)]),
    );
  }

  // Sobe dois níveis de PERTENCE_A: conceito → tópico → assunto.
  private async parentMaps(conceptNodeToId: Map<string, string>): Promise<ParentMaps> {
    const topicoNodeByConceptNode = await this.pertenceA(
      [...conceptNodeToId.keys()],
      TipoNode.TOPICO,
    );
    const topicoNodes = [...new Set(topicoNodeByConceptNode.values())];
    const assuntoNodeByTopicoNode = await this.pertenceA(topicoNodes, TipoNode.ASSUNTO);
    const assuntoNodes = [...new Set(assuntoNodeByTopicoNode.values())];
    return {
      topicoNodeByConceptNode,
      assuntoNodeByTopicoNode,
      topicoByNode: await this.topicoEntities(topicoNodes),
      assuntoByNode: await this.assuntoEntities(assuntoNodes),
    };
  }

  // Arestas PERTENCE_A que saem dos nós dados e chegam num nó do tipo pedido.
  private async pertenceA(fromNodes: string[], destino: TipoNode): Promise<Map<string, string>> {
    if (fromNodes.length === 0) return new Map();
    const edges = await this.prisma.conhecimentoAresta.findMany({
      where: {
        tipoRelacao: PERTENCE_A,
        nodeOrigemId: { in: fromNodes },
        nodeDestino: { tipoNode: destino },
      },
      select: { nodeOrigemId: true, nodeDestinoId: true },
    });
    return new Map(
      edges
        .filter((e): e is { nodeOrigemId: string; nodeDestinoId: string } =>
          Boolean(e.nodeOrigemId && e.nodeDestinoId),
        )
        .map((e) => [e.nodeOrigemId, e.nodeDestinoId]),
    );
  }

  private async topicoEntities(nodeIds: string[]): Promise<Map<string, NamedEntity>> {
    const refs = await this.nodeRefs(nodeIds);
    if (refs.size === 0) return new Map();
    const rows = await this.prisma.topico.findMany({
      where: { id: { in: [...new Set(refs.values())] } },
      select: { id: true, nome: true },
    });
    return namedByNode(refs, rows);
  }

  private async assuntoEntities(nodeIds: string[]): Promise<Map<string, NamedEntity>> {
    const refs = await this.nodeRefs(nodeIds);
    if (refs.size === 0) return new Map();
    const rows = await this.prisma.assunto.findMany({
      where: { id: { in: [...new Set(refs.values())] } },
      select: { id: true, nome: true },
    });
    return namedByNode(refs, rows);
  }

  // nodeId → referenciaId (o id da entidade por trás do nó).
  private async nodeRefs(nodeIds: string[]): Promise<Map<string, string>> {
    if (nodeIds.length === 0) return new Map();
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { id: { in: nodeIds } },
      select: { id: true, referenciaId: true },
    });
    return new Map(nodes.map((n) => [n.id, n.referenciaId]));
  }
}

// Junta nodeId → referenciaId com as entidades carregadas → nodeId → { id, nome }.
function namedByNode(refs: Map<string, string>, rows: NamedEntity[]): Map<string, NamedEntity> {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out = new Map<string, NamedEntity>();
  for (const [nodeId, refId] of refs) {
    const entity = byId.get(refId);
    if (entity) out.set(nodeId, entity);
  }
  return out;
}
