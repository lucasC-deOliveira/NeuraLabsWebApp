import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  CompositionInput,
  CompositionRootType,
  CompositionSource,
  ConceptChain,
  LeafInput,
} from '../../domain/ports/composition-source';

// Include da cadeia conceito → tópico → assunto, reusado em todas as consultas.
const CHAIN_INCLUDE = {
  conceito: { include: { topico: { include: { assunto: true } } } },
} as const;

interface RawConceito {
  id: string;
  nome: string;
  topico: { id: string; nome: string; assunto: { id: string; nome: string } | null } | null;
}

function toChain(conceito: RawConceito | null): ConceptChain {
  if (!conceito) return { conceito: null };
  const t = conceito.topico;
  return {
    conceito: {
      id: conceito.id,
      nome: conceito.nome,
      topico: t
        ? {
            id: t.id,
            nome: t.nome,
            assunto: t.assunto ? { id: t.assunto.id, nome: t.assunto.nome } : null,
          }
        : null,
    },
  };
}

function toLeaf(
  id: string,
  type: 'FLASHCARD' | 'QUESTION',
  label: string,
  conceito: RawConceito | null,
): LeafInput {
  return { id, type, label, ...toChain(conceito) };
}

// Deriva a composição a partir do modelo relacional (mesmo espírito de knowledge-graph).
@Injectable()
export class PrismaCompositionSource implements CompositionSource {
  constructor(private readonly prisma: PrismaService) {}

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
      include: CHAIN_INCLUDE,
    });
    if (!fc) return null;
    return leafRoot('FLASHCARD', fc.id, fc.pergunta, fc.conceito);
  }

  private async questao(userId: string, id: string): Promise<CompositionInput | null> {
    const q = await this.prisma.questao.findFirst({
      where: { id, usuarioId: userId },
      include: CHAIN_INCLUDE,
    });
    if (!q) return null;
    return leafRoot('QUESTION', q.id, q.enunciado, q.conceito);
  }

  private async baralho(userId: string, id: string): Promise<CompositionInput | null> {
    const b = await this.prisma.baralho.findFirst({
      where: { id, usuarioId: userId },
      include: { flashcards: { include: CHAIN_INCLUDE } },
    });
    if (!b) return null;
    const leaves = b.flashcards.map((f) => toLeaf(f.id, 'FLASHCARD', f.pergunta, f.conceito));
    return { root: { id: b.id, type: 'BARALHO', label: b.titulo }, rootIsLeaf: false, leaves };
  }

  private async prova(userId: string, id: string): Promise<CompositionInput | null> {
    const p = await this.prisma.prova.findFirst({
      where: { id, usuarioId: userId },
      include: { questoes: { include: { questao: { include: CHAIN_INCLUDE } } } },
    });
    if (!p) return null;
    const leaves = p.questoes.map((pq) =>
      toLeaf(pq.questao.id, 'QUESTION', pq.questao.enunciado, pq.questao.conceito),
    );
    return { root: { id: p.id, type: 'PROVA', label: p.titulo }, rootIsLeaf: false, leaves };
  }
}

// Raiz que é a própria folha (flashcard/questão): a cadeia sai do próprio item.
function leafRoot(
  type: 'FLASHCARD' | 'QUESTION',
  id: string,
  label: string,
  conceito: RawConceito | null,
): CompositionInput {
  return {
    root: { id, type, label },
    rootIsLeaf: true,
    leaves: [toLeaf(id, type, label, conceito)],
  };
}
