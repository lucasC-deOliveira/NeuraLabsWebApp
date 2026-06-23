import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import {
  getAllowedRelations,
  isRelationAllowed,
} from '../modules/graph/domain/services/relation-rules';

export interface ImportGraphNode {
  ref: string;
  tipo: string;
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
}
export interface ImportGraphEdge {
  origem: string;
  destino: string;
  relacao: string;
  peso?: number;
}
export interface ImportGraphPayload {
  nodes: ImportGraphNode[];
  edges: ImportGraphEdge[];
}

const IMPORT_NODE_TIPOS = [
  'ASSUNTO',
  'TOPICO',
  'CONCEITO',
  'FLASHCARD',
  'NOTA',
  'TEXTO_BRUTO',
  'BARALHO',
];
const NOTA_SUBTIPOS = [
  'DEFINICAO',
  'EXPLICACAO',
  'EXEMPLO',
  'COMPARACAO',
  'SINTESE',
  'PREREQUISITO',
  'ERRO_COMUM',
  'APLICACAO',
];
const MAX = { nodes: 2000, edges: 5000 };

function notaSlug(titulo: string, when: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${when.getFullYear()}${p(when.getMonth() + 1)}${p(when.getDate())}${p(when.getHours())}${p(when.getMinutes())}${p(when.getSeconds())}`;
  const slug = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug ? `${stamp}-${slug}` : stamp;
}
function deriveNotaTitulo(conteudo: string): string {
  const line =
    conteudo
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? '';
  const clean = line
    .replace(/^#{1,6}\s*/, '')
    .replace(/[*_`]/g, '')
    .trim();
  return clean ? clean.slice(0, 120) : 'Sem título';
}
function displayName(n: ImportGraphNode): string {
  switch (n.tipo) {
    case 'ASSUNTO':
    case 'TOPICO':
    case 'CONCEITO':
      return (n.nome ?? '').trim();
    case 'FLASHCARD':
      return (n.pergunta ?? '').trim();
    case 'NOTA':
      return (n.titulo?.trim() || deriveNotaTitulo(n.conteudo ?? '')).trim();
    case 'TEXTO_BRUTO':
      return n.titulo?.trim() || 'Texto sem título';
    case 'BARALHO':
      return (n.titulo ?? n.nome ?? '').trim();
    default:
      return '';
  }
}
const norm = (s: string) => s.trim().toLowerCase();

function validateFields(n: ImportGraphNode, pos: string): void {
  const need = (cond: boolean, msg: string) => {
    if (!cond) throw new BadRequestException(`${msg}${pos}.`);
  };
  switch (n.tipo) {
    case 'ASSUNTO':
    case 'TOPICO':
    case 'CONCEITO':
      need(!!n.nome?.trim(), '"nome" é obrigatório');
      break;
    case 'FLASHCARD':
      need(!!n.pergunta?.trim(), '"pergunta" é obrigatória');
      need(!!n.resposta?.trim(), '"resposta" é obrigatória');
      break;
    case 'NOTA':
      need(!!n.conteudo?.trim(), '"conteudo" é obrigatório');
      need(
        ['LITERATURA', 'PERMANENTE', 'ESTRUTURA'].includes(n.tipoNota || 'PERMANENTE'),
        '"tipoNota" inválido',
      );
      need(NOTA_SUBTIPOS.includes(n.subtipo ?? ''), '"subtipo" inválido');
      if ((n.tipoNota || 'PERMANENTE') === 'LITERATURA')
        need(!!n.fonte?.trim(), 'Notas LITERATURA exigem "fonte"');
      break;
    case 'TEXTO_BRUTO':
      need(!!n.texto?.trim(), '"texto" é obrigatório');
      break;
    case 'BARALHO':
      need(!!(n.titulo?.trim() || n.nome?.trim()), '"titulo" é obrigatório');
      break;
  }
}

export async function runImportGraph(
  prisma: PrismaService,
  userId: string,
  grafoId: string,
  payload: ImportGraphPayload,
): Promise<{ nodes: number; edges: number; reused: number }> {
  const grafo = await prisma.grafosConhecimento.findFirst({
    where: { id: grafoId, usuarioId: userId },
  });
  if (!grafo) throw new NotFoundException('Grafo não encontrado ou não pertence ao usuário');

  const nodes = payload?.nodes ?? [];
  const edges = payload?.edges ?? [];
  if (nodes.length === 0) throw new BadRequestException('Forneça ao menos um nó.');
  if (nodes.length > MAX.nodes) throw new BadRequestException(`Máximo de ${MAX.nodes} nós.`);
  if (edges.length > MAX.edges) throw new BadRequestException(`Máximo de ${MAX.edges} arestas.`);

  const refSet = new Set<string>();
  const refTipo = new Map<string, string>();
  for (const [i, n] of nodes.entries()) {
    const pos = ` (nó #${i + 1})`;
    const ref = typeof n.ref === 'string' ? n.ref.trim() : '';
    if (!ref) throw new BadRequestException(`Cada nó precisa de um "ref"${pos}.`);
    if (refSet.has(ref)) throw new BadRequestException(`"ref" duplicado: "${ref}"${pos}.`);
    if (!IMPORT_NODE_TIPOS.includes(n.tipo))
      throw new BadRequestException(`"tipo" inválido (${n.tipo})${pos}.`);
    refSet.add(ref);
    refTipo.set(ref, n.tipo);
    validateFields(n, pos);
  }
  for (const [i, e] of edges.entries()) {
    const pos = ` (aresta #${i + 1})`;
    const to = refTipo.get(e.origem);
    const td = refTipo.get(e.destino);
    if (!to) throw new BadRequestException(`"origem" desconhecida ("${e.origem}")${pos}.`);
    if (!td) throw new BadRequestException(`"destino" desconhecido ("${e.destino}")${pos}.`);
    if (e.origem === e.destino)
      throw new BadRequestException(`Aresta não pode ligar um nó a si mesmo${pos}.`);
    if (e.peso !== undefined && (!Number.isFinite(e.peso) || e.peso <= 0 || e.peso > 2))
      throw new BadRequestException(`"peso" deve ser 0 a 2${pos}.`);
    if (!isRelationAllowed(to, td, e.relacao)) {
      const allowed = getAllowedRelations(to, td);
      throw new BadRequestException(
        `Relação "${e.relacao}" não permitida entre ${to} e ${td}${pos}.${allowed.length ? ` Permitidas: ${allowed.join(', ')}.` : ''}`,
      );
    }
  }

  const now = new Date();
  return prisma.$transaction(
    async (tx) => {
      const created = new Map<string, { refId: string; nodeId: string }>();
      const createEntity = async (n: ImportGraphNode): Promise<string> => {
        switch (n.tipo) {
          case 'ASSUNTO':
            return (
              await tx.assunto.create({
                data: { nome: n.nome!.trim(), descricao: n.descricao ?? null, usuarioId: userId },
              })
            ).id;
          case 'TOPICO':
            return (
              await tx.topico.create({
                data: { nome: n.nome!.trim(), descricao: n.descricao ?? null, usuarioId: userId },
              })
            ).id;
          case 'CONCEITO':
            return (
              await tx.conceito.create({
                data: { nome: n.nome!.trim(), descricao: n.descricao ?? null, usuarioId: userId },
              })
            ).id;
          case 'FLASHCARD':
            return (
              await tx.flashcard.create({
                data: {
                  pergunta: n.pergunta!.trim(),
                  resposta: n.resposta!.trim(),
                  usuarioId: userId,
                  dataCriacao: now,
                },
              })
            ).id;
          case 'NOTA': {
            const t = n.titulo?.trim() || deriveNotaTitulo(n.conteudo ?? '');
            return (
              await tx.nota.create({
                data: {
                  titulo: t,
                  conteudo: n.conteudo!,
                  tipoNota: n.tipoNota || 'PERMANENTE',
                  subtipo: n.subtipo as any,
                  fonte: n.fonte?.trim() || null,
                  slug: notaSlug(t, now),
                  usuarioId: userId,
                  dataCriacao: now,
                },
              })
            ).id;
          }
          case 'TEXTO_BRUTO':
            return (
              await tx.textoBruto.create({
                data: {
                  titulo: n.titulo?.trim() || 'Texto sem título',
                  texto: n.texto!,
                  usuarioId: userId,
                  dataCriacao: now,
                },
              })
            ).id;
          case 'BARALHO':
            return (
              await tx.baralho.create({
                data: {
                  titulo: (n.titulo ?? n.nome ?? '').trim(),
                  usuarioId: userId,
                  dataCriacao: now,
                },
              })
            ).id;
          default:
            throw new BadRequestException(`Tipo desconhecido: ${n.tipo}`);
        }
      };

      // reuso por tipo::nome dos nós já presentes
      const existing = await tx.nodeConhecimento.findMany({
        where: { grafoId, usuarioId: userId },
        select: { id: true, tipoNode: true, referenciaId: true },
      });
      const refsByTipo = new Map<string, string[]>();
      for (const e of existing)
        (refsByTipo.get(e.tipoNode) ?? refsByTipo.set(e.tipoNode, []).get(e.tipoNode)!).push(
          e.referenciaId,
        );
      const nameByRef = new Map<string, string>();
      for (const [tipo, ids] of refsByTipo) {
        if (!ids.length) continue;
        let rows: Array<{ id: string; name: string | null }> = [];
        if (tipo === 'ASSUNTO')
          rows = (
            await tx.assunto.findMany({
              where: { id: { in: ids } },
              select: { id: true, nome: true },
            })
          ).map((r) => ({ id: r.id, name: r.nome }));
        else if (tipo === 'TOPICO')
          rows = (
            await tx.topico.findMany({
              where: { id: { in: ids } },
              select: { id: true, nome: true },
            })
          ).map((r) => ({ id: r.id, name: r.nome }));
        else if (tipo === 'CONCEITO')
          rows = (
            await tx.conceito.findMany({
              where: { id: { in: ids } },
              select: { id: true, nome: true },
            })
          ).map((r) => ({ id: r.id, name: r.nome }));
        else if (tipo === 'FLASHCARD')
          rows = (
            await tx.flashcard.findMany({
              where: { id: { in: ids } },
              select: { id: true, pergunta: true },
            })
          ).map((r) => ({ id: r.id, name: r.pergunta }));
        else if (tipo === 'NOTA')
          rows = (
            await tx.nota.findMany({
              where: { id: { in: ids } },
              select: { id: true, titulo: true },
            })
          ).map((r) => ({ id: r.id, name: r.titulo }));
        else if (tipo === 'TEXTO_BRUTO')
          rows = (
            await tx.textoBruto.findMany({
              where: { id: { in: ids } },
              select: { id: true, titulo: true },
            })
          ).map((r) => ({ id: r.id, name: r.titulo }));
        else if (tipo === 'BARALHO')
          rows = (
            await tx.baralho.findMany({
              where: { id: { in: ids } },
              select: { id: true, titulo: true },
            })
          ).map((r) => ({ id: r.id, name: r.titulo }));
        for (const r of rows) nameByRef.set(r.id, norm(r.name ?? ''));
      }
      const byName = new Map<string, { refId: string; nodeId: string }>();
      for (const e of existing) {
        const nm = nameByRef.get(e.referenciaId);
        if (nm) byName.set(`${e.tipoNode}::${nm}`, { refId: e.referenciaId, nodeId: e.id });
      }

      let createdNodeCount = 0;
      let reusedNodeCount = 0;
      for (const n of nodes) {
        const key = `${n.tipo}::${norm(displayName(n))}`;
        const reuse = byName.get(key);
        if (reuse) {
          created.set(n.ref.trim(), reuse);
          reusedNodeCount++;
          continue;
        }
        const refId = await createEntity(n);
        const node = await tx.nodeConhecimento.create({
          data: { grafoId, tipoNode: n.tipo as any, referenciaId: refId, usuarioId: userId },
        });
        const entry = { refId, nodeId: node.id };
        created.set(n.ref.trim(), entry);
        byName.set(key, entry);
        createdNodeCount++;
      }

      const existingEdges = await tx.conhecimentoAresta.findMany({
        where: { grafoId },
        select: { nodeOrigemId: true, nodeDestinoId: true, tipoRelacao: true },
      });
      const seen = new Set(
        existingEdges.map((e) => `${e.nodeOrigemId}->${e.nodeDestinoId}->${e.tipoRelacao}`),
      );
      let edgeCount = 0;
      for (const e of edges) {
        const s = created.get(e.origem);
        const t = created.get(e.destino);
        if (!s || !t) continue;
        const key = `${s.nodeId}->${t.nodeId}->${e.relacao}`;
        if (seen.has(key)) continue;
        await tx.conhecimentoAresta.create({
          data: {
            grafoId,
            nodeOrigemId: s.nodeId,
            nodeDestinoId: t.nodeId,
            tipoRelacao: e.relacao as any,
            peso: e.peso ?? 1,
          },
        });
        seen.add(key);
        edgeCount++;
        if (
          refTipo.get(e.origem) === 'BARALHO' &&
          refTipo.get(e.destino) === 'FLASHCARD' &&
          e.relacao === 'CONTEM'
        ) {
          await tx.baralho.update({
            where: { id: s.refId },
            data: { flashcards: { connect: { id: t.refId } } },
          });
        }
      }
      return { nodes: createdNodeCount, edges: edgeCount, reused: reusedNodeCount };
    },
    { maxWait: 10_000, timeout: 120_000 },
  );
}
