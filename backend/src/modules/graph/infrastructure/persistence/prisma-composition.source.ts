import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaConnectedConceptsQuery } from '../../../curriculum/infrastructure/persistence/prisma-connected-concepts.query';
import type { ConceptTag } from '../../../curriculum/domain/curriculum-views';
import type {
  CompositionInput,
  CompositionRootType,
  ConceptChainItem,
  CompositionSource,
  LeafInput,
} from '../../domain/ports/composition-source';

// ConceptTag (nome + tópico/assunto pais, do grafo) → cadeia com ids. O conceito
// não tem id relacional exposto aqui; usamos um id sintético estável por nome
// (só para a VISTA — deduplica conceitos iguais). Tópico/assunto têm id real.
function toChain(tag: ConceptTag): ConceptChainItem {
  return {
    conceitoId: `conceito:${tag.conceito}`,
    conceito: tag.conceito,
    topicoId: tag.topicoId || null,
    topico: tag.topico || null,
    assuntoId: tag.assuntoId || null,
    assunto: tag.assunto || null,
  };
}

function toLeaf(id: string, type: 'FLASHCARD' | 'QUESTION', label: string, tags: ConceptTag[]): LeafInput {
  return { id, type, label, chains: tags.map(toChain) };
}

// Deriva a composição do GRAFO: baralho/prova via composição relacional (m2m /
// ProvaQuestao) e os conceitos de cada folha via arestas do grafo (mesma fonte
// que a listagem usa em conceitosConectados). O conceitoId relacional é ignorado
// de propósito — na prática fica nulo e a hierarquia real é a do grafo.
@Injectable()
export class PrismaCompositionSource implements CompositionSource {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connected: PrismaConnectedConceptsQuery,
  ) {}

  load(userId: string, tipo: CompositionRootType, id: string): Promise<CompositionInput | null> {
    if (tipo === 'FLASHCARD') return this.flashcard(userId, id);
    if (tipo === 'QUESTION') return this.questao(userId, id);
    if (tipo === 'BARALHO') return this.baralho(userId, id);
    if (tipo === 'PROVA') return this.prova(userId, id);
    throw new Error(`invalid tipo: "${tipo}". Expected: FLASHCARD|QUESTION|BARALHO|PROVA`);
  }

  private async flashcard(userId: string, id: string): Promise<CompositionInput | null> {
    const fc = await this.prisma.flashcard.findFirst({
      where: { id, usuarioId: userId },
      select: { id: true, pergunta: true },
    });
    if (!fc) return null;
    const tags = await this.connected.forFlashcards(userId, [id]);
    return leafRoot('FLASHCARD', fc.id, fc.pergunta, tags.get(id) ?? []);
  }

  private async questao(userId: string, id: string): Promise<CompositionInput | null> {
    const q = await this.prisma.questao.findFirst({
      where: { id, usuarioId: userId },
      select: { id: true, enunciado: true },
    });
    if (!q) return null;
    const tags = await this.connected.forQuestions(userId, [id]);
    return leafRoot('QUESTION', q.id, q.enunciado, tags.get(id) ?? []);
  }

  private async baralho(userId: string, id: string): Promise<CompositionInput | null> {
    const b = await this.prisma.baralho.findFirst({
      where: { id, usuarioId: userId },
      select: { id: true, titulo: true, flashcards: { select: { id: true, pergunta: true } } },
    });
    if (!b) return null;
    const tags = await this.connected.forFlashcards(userId, b.flashcards.map((f) => f.id));
    const leaves = b.flashcards.map((f) => toLeaf(f.id, 'FLASHCARD', f.pergunta, tags.get(f.id) ?? []));
    return { root: { id: b.id, type: 'BARALHO', label: b.titulo }, rootIsLeaf: false, leaves };
  }

  private async prova(userId: string, id: string): Promise<CompositionInput | null> {
    const p = await this.prisma.prova.findFirst({
      where: { id, usuarioId: userId },
      select: { id: true, titulo: true, questoes: { select: { questao: { select: { id: true, enunciado: true } } } } },
    });
    if (!p) return null;
    const questoes = p.questoes.map((pq) => pq.questao);
    const tags = await this.connected.forQuestions(userId, questoes.map((q) => q.id));
    const leaves = questoes.map((q) => toLeaf(q.id, 'QUESTION', q.enunciado, tags.get(q.id) ?? []));
    return { root: { id: p.id, type: 'PROVA', label: p.titulo }, rootIsLeaf: false, leaves };
  }
}

// Raiz que é a própria folha (flashcard/questão): a cadeia sai do próprio item.
function leafRoot(
  type: 'FLASHCARD' | 'QUESTION',
  id: string,
  label: string,
  tags: ConceptTag[],
): CompositionInput {
  return { root: { id, type, label }, rootIsLeaf: true, leaves: [toLeaf(id, type, label, tags)] };
}
