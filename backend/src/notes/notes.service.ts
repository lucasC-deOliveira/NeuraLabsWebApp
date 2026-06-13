import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotas(userId: string) {
    const notas = await this.prisma.nota.findMany({ where: { usuarioId: userId }, orderBy: { dataCriacao: 'desc' } });
    const notaIds = notas.map((n) => n.id);
    const allEdges = await this.prisma.conhecimentoAresta.findMany({ where: { notaOrigemId: { in: notaIds } }, include: { nodeDestino: true } });
    const fcCounts = await this.prisma.conhecimentoAresta.groupBy({
      by: ['notaOrigemId'],
      _count: { notaOrigemId: true },
      where: { notaOrigemId: { in: notaIds }, nodeDestino: { tipoNode: 'FLASHCARD' } },
    });
    const fcCountMap = new Map<string, number>();
    for (const g of fcCounts) if (g.notaOrigemId) fcCountMap.set(g.notaOrigemId, g._count.notaOrigemId);

    const edgesByNota = new Map<string, typeof allEdges>();
    const conceitoIds = new Set<string>();
    for (const edge of allEdges) {
      if (!edge.notaOrigemId) continue;
      (edgesByNota.get(edge.notaOrigemId) ?? edgesByNota.set(edge.notaOrigemId, []).get(edge.notaOrigemId)!).push(edge);
      if (edge.nodeDestino?.tipoNode === 'CONCEITO') conceitoIds.add(edge.nodeDestino.referenciaId);
    }
    const allConcepts = await this.prisma.conceito.findMany({ where: { id: { in: [...conceitoIds] } } });
    const conceptMap = new Map(allConcepts.map((c) => [c.id, c.nome]));

    return notas.map((nota) => {
      const edges = edgesByNota.get(nota.id) ?? [];
      const conceitosRelacionados: { nome: string; id: string }[] = [];
      for (const edge of edges) {
        if (edge.nodeDestino?.tipoNode === 'CONCEITO') {
          const nome = conceptMap.get(edge.nodeDestino.referenciaId);
          if (nome) conceitosRelacionados.push({ nome, id: edge.nodeDestino.referenciaId });
        }
      }
      const conteudo = nota.conteudo || '';
      const titulo = conteudo.split('\n')[0].replace(/^#+\s*/, '').slice(0, 80) || 'Sem titulo';
      const preview = conteudo.replace(/^#+\s.*\n?/, '').slice(0, 200).trim();
      const wordCount = conteudo.trim().split(/\s+/).filter(Boolean).length;
      return { id: nota.id, titulo, preview, dataCriacao: nota.dataCriacao, conceitosRelacionados, flashcardCount: fcCountMap.get(nota.id) ?? 0, wordCount };
    });
  }

  async getNotaById(userId: string, notaId: string) {
    const nota = await this.prisma.nota.findFirst({ where: { id: notaId, usuarioId: userId }, include: { arestasOrigem: { include: { nodeDestino: true } } } });
    if (!nota) return null;
    const conceitosRelacionados: { nome: string; tipoRelacao: string }[] = [];
    for (const edge of nota.arestasOrigem) {
      if (edge.nodeDestino?.tipoNode === 'CONCEITO') {
        const conceito = await this.prisma.conceito.findUnique({ where: { id: edge.nodeDestino.referenciaId } });
        if (conceito) conceitosRelacionados.push({ nome: conceito.nome, tipoRelacao: edge.tipoRelacao });
      }
    }
    return { id: nota.id, conteudo: nota.conteudo, dataCriacao: nota.dataCriacao, conceitosRelacionados };
  }

  async deleteNota(userId: string, id: string) {
    await this.prisma.nota.deleteMany({ where: { id, usuarioId: userId } });
    return { success: true };
  }

  async deleteAllNotas(userId: string) {
    const res = await this.prisma.nota.deleteMany({ where: { usuarioId: userId } });
    return { count: res.count };
  }

  // assuntos que têm conceitos ligados às notas do usuário (filtro)
  async getNotasFilterData(userId: string): Promise<Array<{ id: string; nome: string }>> {
    const notas = await this.prisma.nota.findMany({ where: { usuarioId: userId }, include: { arestasOrigem: { include: { nodeDestino: true } } } });
    const conceitoIds = new Set<string>();
    for (const nota of notas) for (const edge of nota.arestasOrigem) if (edge.nodeDestino?.tipoNode === 'CONCEITO') conceitoIds.add(edge.nodeDestino.referenciaId);
    if (conceitoIds.size === 0) return [];
    const conceitos = await this.prisma.conceito.findMany({ where: { id: { in: [...conceitoIds] } }, include: { topico: true } });
    const assuntoIds = new Set<string>();
    for (const c of conceitos) if (c.topico?.assuntoId) assuntoIds.add(c.topico.assuntoId);
    const assuntos = await this.prisma.assunto.findMany({ where: { id: { in: [...assuntoIds] } } });
    return assuntos.map((a) => ({ id: a.id, nome: a.nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }
}
