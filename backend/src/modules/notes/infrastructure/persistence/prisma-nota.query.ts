import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NotaQuery } from '../../domain/ports/nota-query';
import type { FilterAssunto, NotaDetail, NotaListItem } from '../../domain/note-views';
import { derivePreview } from '../../domain/note-preview';

const DEST_SELECT = { tipoNode: true, referenciaId: true } as const;
const EDGE_SELECT = {
  notaOrigemId: true,
  tipoRelacao: true,
  nodeDestino: { select: DEST_SELECT },
} as const;
const NOTA_SELECT = {
  id: true,
  conteudo: true,
  dataCriacao: true,
  subtipo: true,
  tipoNota: true,
} as const;

type Edge = Prisma.ConhecimentoArestaGetPayload<{ select: typeof EDGE_SELECT }>;
type NotaRow = Prisma.NotaGetPayload<{ select: typeof NOTA_SELECT }>;
type Dest = { nodeDestino: { tipoNode: string; referenciaId: string } | null };

@Injectable()
export class PrismaNotaQuery implements NotaQuery {
  constructor(private readonly prisma: PrismaService) {}

  async listNotas(userId: string): Promise<NotaListItem[]> {
    const notas = await this.prisma.nota.findMany({
      where: { usuarioId: userId },
      orderBy: { dataCriacao: 'desc' },
      select: NOTA_SELECT,
    });
    const edges = await this.loadEdges(notas.map((n) => n.id));
    const names = await this.conceptNames(edges);
    const byNota = groupByNota(edges);
    return notas.map((n) => toListItem(n, byNota.get(n.id) ?? [], names));
  }

  async findNotaDetail(userId: string, notaId: string): Promise<NotaDetail | null> {
    const nota = await this.prisma.nota.findFirst({
      where: { id: notaId, usuarioId: userId },
      select: { ...NOTA_SELECT, arestasOrigem: { select: EDGE_SELECT } },
    });
    if (!nota) return null;
    const names = await this.conceptNames(nota.arestasOrigem);
    return {
      id: nota.id,
      conteudo: nota.conteudo,
      dataCriacao: nota.dataCriacao,
      conceitosRelacionados: detailConceitos(nota.arestasOrigem, names),
      subtipo: nota.subtipo ?? null,
      tipoNota: nota.tipoNota,
    };
  }

  async listFilterAssuntos(userId: string): Promise<FilterAssunto[]> {
    const notas = await this.prisma.nota.findMany({
      where: { usuarioId: userId },
      select: { arestasOrigem: { select: { nodeDestino: { select: DEST_SELECT } } } },
    });
    const conceitoIds = collectConceitoIds(notas.flatMap((n) => n.arestasOrigem));
    if (conceitoIds.length === 0) return [];
    const assuntoIds = await this.assuntoIdsOf(conceitoIds);
    const assuntos = await this.prisma.assunto.findMany({
      where: { id: { in: assuntoIds } },
      select: { id: true, nome: true },
    });
    return assuntos.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  private loadEdges(notaIds: string[]): Promise<Edge[]> {
    return this.prisma.conhecimentoAresta.findMany({
      where: { notaOrigemId: { in: notaIds } },
      select: EDGE_SELECT,
    });
  }

  private async conceptNames(edges: Dest[]): Promise<Map<string, string>> {
    const ids = collectConceitoIds(edges);
    const conceitos = await this.prisma.conceito.findMany({
      where: { id: { in: ids } },
      select: { id: true, nome: true },
    });
    return new Map(conceitos.map((c) => [c.id, c.nome]));
  }

  private async assuntoIdsOf(conceitoIds: string[]): Promise<string[]> {
    const conceitos = await this.prisma.conceito.findMany({
      where: { id: { in: conceitoIds } },
      select: { topico: { select: { assuntoId: true } } },
    });
    return [...new Set(conceitos.map((c) => c.topico?.assuntoId).filter((x): x is string => !!x))];
  }
}

const isConceito = (e: Dest): boolean => e.nodeDestino?.tipoNode === 'CONCEITO';

function collectConceitoIds(edges: Dest[]): string[] {
  const ids = new Set<string>();
  for (const e of edges) if (isConceito(e) && e.nodeDestino) ids.add(e.nodeDestino.referenciaId);
  return [...ids];
}

function groupByNota(edges: Edge[]): Map<string, Edge[]> {
  const map = new Map<string, Edge[]>();
  for (const e of edges) {
    if (!e.notaOrigemId) continue;
    (map.get(e.notaOrigemId) ?? map.set(e.notaOrigemId, []).get(e.notaOrigemId)!).push(e);
  }
  return map;
}

function relatedConceitos(
  edges: Edge[],
  names: Map<string, string>,
): Array<{ nome: string; id: string }> {
  const out: Array<{ nome: string; id: string }> = [];
  for (const e of edges) {
    if (!isConceito(e) || !e.nodeDestino) continue;
    const nome = names.get(e.nodeDestino.referenciaId);
    if (nome) out.push({ nome, id: e.nodeDestino.referenciaId });
  }
  return out;
}

function detailConceitos(
  edges: Edge[],
  names: Map<string, string>,
): Array<{ nome: string; tipoRelacao: string }> {
  const out: Array<{ nome: string; tipoRelacao: string }> = [];
  for (const e of edges) {
    if (!isConceito(e) || !e.nodeDestino) continue;
    const nome = names.get(e.nodeDestino.referenciaId);
    if (nome) out.push({ nome, tipoRelacao: e.tipoRelacao });
  }
  return out;
}

function toListItem(nota: NotaRow, edges: Edge[], names: Map<string, string>): NotaListItem {
  const { titulo, preview, wordCount } = derivePreview(nota.conteudo || '');
  return {
    id: nota.id,
    titulo,
    preview,
    dataCriacao: nota.dataCriacao,
    conceitosRelacionados: relatedConceitos(edges, names),
    flashcardCount: edges.filter((e) => e.nodeDestino?.tipoNode === 'FLASHCARD').length,
    wordCount,
    subtipo: nota.subtipo ?? null,
    tipoNota: nota.tipoNota,
  };
}
