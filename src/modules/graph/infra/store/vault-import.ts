import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { buildNotaSlug } from "@/lib/nota-slug";
import { PARA_FOLDERS, parseNode, type VaultNode } from "./vault-format";

// Importa o vault Markdown PARA de volta para o banco (migração arquivos → banco).
// Idempotente: faz upsert das entidades, nós e arestas pelos ids do frontmatter,
// preservando os ids (e portanto os vínculos de SRS). Os grafos referenciados
// devem existir no banco (a lista de grafos sempre vive no banco).
export async function importVaultToDatabase(
  userId: string,
  vaultPath: string,
): Promise<{ nodes: number; edges: number }> {
  // lê todos os nós do vault
  const vaultNodes: VaultNode[] = [];
  for (const folder of PARA_FOLDERS) {
    const dir = path.join(vaultPath, folder);
    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const file of entries) {
      if (!file.endsWith(".md")) continue;
      const node = parseNode(await fs.readFile(path.join(dir, file), "utf8"));
      if (node) vaultNodes.push(node);
    }
  }

  const now = new Date();
  let nodeCount = 0;
  let edgeCount = 0;

  // refId -> nodeConhecimento.id (para montar as arestas depois)
  const nodeDbId = new Map<string, string>();

  await prisma.$transaction(async (tx) => {
    for (const n of vaultNodes) {
      // upsert da entidade, preservando o id
      switch (n.tipo) {
        case "ASSUNTO":
          await tx.assunto.upsert({
            where: { id: n.id },
            create: { id: n.id, nome: n.nome ?? "", descricao: n.descricao ?? null, usuarioId: userId },
            update: { nome: n.nome ?? "", descricao: n.descricao ?? null },
          });
          break;
        case "TOPICO":
          await tx.topico.upsert({
            where: { id: n.id },
            create: { id: n.id, nome: n.nome ?? "", descricao: n.descricao ?? null, usuarioId: userId },
            update: { nome: n.nome ?? "", descricao: n.descricao ?? null },
          });
          break;
        case "CONCEITO":
          await tx.conceito.upsert({
            where: { id: n.id },
            create: { id: n.id, nome: n.nome ?? "", descricao: n.descricao ?? null, usuarioId: userId },
            update: { nome: n.nome ?? "", descricao: n.descricao ?? null },
          });
          break;
        case "FLASHCARD":
          await tx.flashcard.upsert({
            where: { id: n.id },
            create: { id: n.id, pergunta: n.pergunta ?? "", resposta: n.resposta ?? "", usuarioId: userId, dataCriacao: now },
            update: { pergunta: n.pergunta ?? "", resposta: n.resposta ?? "" },
          });
          break;
        case "NOTA": {
          const titulo = (n.titulo ?? "").trim();
          await tx.nota.upsert({
            where: { id: n.id },
            create: {
              id: n.id, titulo, conteudo: n.conteudo ?? "", tipoNota: n.tipoNota ?? "PERMANENTE",
              subtipo: n.subtipo ?? "", fonte: n.fonte ?? null, slug: buildNotaSlug(titulo, now), usuarioId: userId, dataCriacao: now,
            },
            update: { titulo, conteudo: n.conteudo ?? "", tipoNota: n.tipoNota ?? "PERMANENTE", subtipo: n.subtipo ?? "", fonte: n.fonte ?? null },
          });
          break;
        }
        case "TEXTO_BRUTO":
          await tx.textoBruto.upsert({
            where: { id: n.id },
            create: { id: n.id, titulo: n.titulo?.trim() || "Texto sem título", texto: n.texto ?? "", usuarioId: userId, dataCriacao: now },
            update: { titulo: n.titulo?.trim() || "Texto sem título", texto: n.texto ?? "" },
          });
          break;
        case "BARALHO":
          await tx.baralho.upsert({
            where: { id: n.id },
            create: { id: n.id, titulo: (n.titulo ?? "").trim(), usuarioId: userId, dataCriacao: now },
            update: { titulo: (n.titulo ?? "").trim() },
          });
          break;
      }

      // upsert do nó do grafo (preserva posição/nível)
      const node = await tx.nodeConhecimento.upsert({
        where: { _node_unique: { usuarioId: userId, grafoId: n.grafoId, tipoNode: n.tipo as never, referenciaId: n.id } },
        create: {
          usuarioId: userId, grafoId: n.grafoId, tipoNode: n.tipo as never, referenciaId: n.id,
          posicaoX: n.posicaoX ?? null, posicaoY: n.posicaoY ?? null, nivelDominio: n.nivelDominio ?? 0,
        },
        update: { posicaoX: n.posicaoX ?? null, posicaoY: n.posicaoY ?? null, nivelDominio: n.nivelDominio ?? 0 },
      });
      nodeDbId.set(n.id, node.id);
      nodeCount++;
    }

    // arestas (origem→destino pelas relações do frontmatter)
    for (const n of vaultNodes) {
      const origemId = nodeDbId.get(n.id);
      if (!origemId) continue;
      for (const r of n.relacoes) {
        const destinoId = nodeDbId.get(r.alvo);
        if (!destinoId) continue;
        await tx.conhecimentoAresta.upsert({
          where: { _edge_uk: { nodeOrigemId: origemId, nodeDestinoId: destinoId, tipoRelacao: r.rel as never } },
          create: { grafoId: n.grafoId, nodeOrigemId: origemId, nodeDestinoId: destinoId, tipoRelacao: r.rel as never, peso: r.peso },
          update: { peso: r.peso },
        });
        edgeCount++;
      }
    }
  }, { maxWait: 10_000, timeout: 120_000 });

  return { nodes: nodeCount, edges: edgeCount };
}
