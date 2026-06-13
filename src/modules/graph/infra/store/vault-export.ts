import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import type { TipoRelacao } from "@/lib/graph";
import {
  PARA_FOLDERS,
  nodeRelPath,
  serializeNode,
  type TipoNode,
  type VaultNode,
} from "./vault-format";

// Exporta TODO o grafo do usuário (todos os grafos) para o vault Markdown PARA.
// É a base da migração banco → arquivos e também serve para validar a leitura.
export async function exportGraphToVault(
  userId: string,
  vaultPath: string,
): Promise<{ nodes: number }> {
  const graphNodes = await prisma.nodeConhecimento.findMany({ where: { usuarioId: userId } });
  const edges = await prisma.conhecimentoAresta.findMany({
    where: { grafo: { usuarioId: userId } },
  });

  // refIds por tipo, para buscar as entidades
  const byType: Record<string, Set<string>> = {};
  for (const n of graphNodes) {
    (byType[n.tipoNode] ??= new Set()).add(n.referenciaId);
  }
  const ids = (t: string) => (byType[t] ? [...byType[t]!] : []);
  const inOr = (arr: string[]) => (arr.length ? arr : ["__none__"]);

  const [assuntos, topicos, conceitos, notas, flashcards, textos, baralhos] = await Promise.all([
    prisma.assunto.findMany({ where: { id: { in: inOr(ids("ASSUNTO")) } } }),
    prisma.topico.findMany({ where: { id: { in: inOr(ids("TOPICO")) } } }),
    prisma.conceito.findMany({ where: { id: { in: inOr(ids("CONCEITO")) } } }),
    prisma.nota.findMany({ where: { id: { in: inOr(ids("NOTA")) } } }),
    prisma.flashcard.findMany({ where: { id: { in: inOr(ids("FLASHCARD")) } } }),
    prisma.textoBruto.findMany({ where: { id: { in: inOr(ids("TEXTO_BRUTO")) } } }),
    prisma.baralho.findMany({ where: { id: { in: inOr(ids("BARALHO")) } } }),
  ]);

  const map = <T extends { id: string }>(arr: T[]) => new Map(arr.map((x) => [x.id, x]));
  const A = map(assuntos), T = map(topicos), C = map(conceitos), N = map(notas);
  const F = map(flashcards), TB = map(textos), B = map(baralhos);

  // nodeConhecimento.id → referenciaId, para traduzir as pontas das arestas
  const nodeIdToRef = new Map(graphNodes.map((n) => [n.id, n.referenciaId]));

  // relações de saída por referenciaId
  const outRel = new Map<string, { rel: TipoRelacao; alvo: string; peso: number }[]>();
  for (const e of edges) {
    let src = e.nodeOrigemId ? nodeIdToRef.get(e.nodeOrigemId) ?? "" : "";
    let tgt = e.nodeDestinoId ? nodeIdToRef.get(e.nodeDestinoId) ?? "" : "";
    if (e.notaOrigemId) src = e.notaOrigemId;
    if (e.notaDestinoId) tgt = e.notaDestinoId;
    if (!src || !tgt) continue;
    (outRel.get(src) ?? outRel.set(src, []).get(src)!).push({
      rel: e.tipoRelacao as TipoRelacao,
      alvo: tgt,
      peso: e.peso,
    });
  }

  // monta os VaultNodes
  const toVault = (n: (typeof graphNodes)[number]): VaultNode | null => {
    const base: VaultNode = {
      id: n.referenciaId,
      tipo: n.tipoNode as TipoNode,
      grafoId: n.grafoId ?? "",
      nivelDominio: n.nivelDominio,
      posicaoX: n.posicaoX,
      posicaoY: n.posicaoY,
      relacoes: outRel.get(n.referenciaId) ?? [],
    };
    switch (n.tipoNode) {
      case "ASSUNTO": {
        const e = A.get(n.referenciaId); if (!e) return null;
        return { ...base, nome: e.nome, descricao: e.descricao };
      }
      case "TOPICO": {
        const e = T.get(n.referenciaId); if (!e) return null;
        return { ...base, nome: e.nome, descricao: e.descricao };
      }
      case "CONCEITO": {
        const e = C.get(n.referenciaId); if (!e) return null;
        return { ...base, nome: e.nome, descricao: e.descricao };
      }
      case "FLASHCARD": {
        const e = F.get(n.referenciaId); if (!e) return null;
        return { ...base, pergunta: e.pergunta, resposta: e.resposta };
      }
      case "NOTA": {
        const e = N.get(n.referenciaId); if (!e) return null;
        return { ...base, titulo: e.titulo, conteudo: e.conteudo, tipoNota: e.tipoNota ?? undefined, subtipo: e.subtipo ?? undefined, fonte: e.fonte };
      }
      case "TEXTO_BRUTO": {
        const e = TB.get(n.referenciaId); if (!e) return null;
        return { ...base, titulo: e.titulo, texto: e.texto };
      }
      case "BARALHO": {
        const e = B.get(n.referenciaId); if (!e) return null;
        return { ...base, titulo: e.titulo };
      }
      default:
        return null;
    }
  };

  // garante as pastas PARA
  for (const folder of PARA_FOLDERS) {
    await fs.mkdir(path.join(vaultPath, folder), { recursive: true });
  }

  let count = 0;
  for (const gn of graphNodes) {
    const vn = toVault(gn);
    if (!vn) continue;
    const rel = nodeRelPath(vn);
    await fs.writeFile(path.join(vaultPath, rel), serializeNode(vn), "utf8");
    count++;
  }

  return { nodes: count };
}
