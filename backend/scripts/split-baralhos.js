// Migração: divide cada BARALHO do grafo "migracao" em seu próprio subgrafo
// Uso: node scripts/split-baralhos.js [nome-do-grafo]
'use strict';
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://neuralabs:neuralabs@localhost:5432/neuralabs?schema=public' } },
});

const grafoNomeFiltro = process.argv[2] || 'migracao';

async function main() {
  // 1. Achar o grafo
  const grafo = await prisma.grafosConhecimento.findFirst({
    where: { nome: { contains: grafoNomeFiltro, mode: 'insensitive' } },
  });
  if (!grafo) {
    console.error(`Grafo com nome contendo "${grafoNomeFiltro}" não encontrado.`);
    process.exit(1);
  }
  console.log(`\nGrafo encontrado: "${grafo.nome}" (id=${grafo.id})`);
  const userId = grafo.usuarioId;

  // 2. Buscar todos os BARALHO nodes nesse grafo
  const baralhoNodes = await prisma.nodeConhecimento.findMany({
    where: { grafoId: grafo.id, tipoNode: 'BARALHO' },
  });
  console.log(`Baralhos encontrados: ${baralhoNodes.length}\n`);
  if (baralhoNodes.length === 0) {
    console.log('Nenhum baralho para dividir.');
    return;
  }

  let done = 0;
  const erros = [];

  for (const baralhoNode of baralhoNodes) {
    // 3. Buscar a entidade Baralho para obter nome e flashcards
    const baralhoEntity = await prisma.baralho.findFirst({
      where: { id: baralhoNode.referenciaId },
      include: { flashcards: { select: { id: true } } },
    });
    if (!baralhoEntity) {
      console.warn(`  [AVISO] Baralho ${baralhoNode.referenciaId} não existe na tabela baralhos — pulando.`);
      erros.push(baralhoNode.referenciaId);
      continue;
    }

    const fcIds = baralhoEntity.flashcards.map((f) => f.id);

    // 4. Encontrar NodeConhecimento dos flashcards neste grafo
    const fcNodes = fcIds.length > 0
      ? await prisma.nodeConhecimento.findMany({
          where: { grafoId: grafo.id, tipoNode: 'FLASHCARD', referenciaId: { in: fcIds } },
        })
      : [];

    const allNodes = [baralhoNode, ...fcNodes];
    const allNodeIds = allNodes.map((n) => n.id);

    // Centróide para o GRAFO_REF
    const centX = allNodes.reduce((s, n) => s + (n.posicaoX ?? 0), 0) / allNodes.length;
    const centY = allNodes.reduce((s, n) => s + (n.posicaoY ?? 0), 0) / allNodes.length;

    // 5. Arestas internas e externas
    const allEdges = await prisma.conhecimentoAresta.findMany({
      where: {
        grafoId: grafo.id,
        OR: [{ nodeOrigemId: { in: allNodeIds } }, { nodeDestinoId: { in: allNodeIds } }],
      },
    });
    const internalIds = new Set(
      allEdges
        .filter(
          (e) =>
            allNodeIds.includes(e.nodeOrigemId ?? '') &&
            allNodeIds.includes(e.nodeDestinoId ?? ''),
        )
        .map((e) => e.id),
    );
    const externalEdges = allEdges.filter((e) => !internalIds.has(e.id));

    // 6. Transação: criar subgrafo, mover nós, criar GRAFO_REF, redirecionar arestas
    try {
      await prisma.$transaction(async (tx) => {
        const filho = await tx.grafosConhecimento.create({
          data: {
            usuarioId: userId,
            nome: baralhoEntity.titulo.trim(),
            descricao: null,
            parentGrafoId: grafo.id,
            tipoRelacaoPai: 'RELACIONADO',
          },
        });

        // Move nós para o filho
        await tx.nodeConhecimento.updateMany({
          where: { id: { in: allNodeIds } },
          data: { grafoId: filho.id },
        });

        // Mover também arestas internas para o subgrafo
        if (internalIds.size > 0) {
          await tx.conhecimentoAresta.updateMany({
            where: { id: { in: [...internalIds] } },
            data: { grafoId: filho.id },
          });
        }

        // Criar GRAFO_REF no pai
        const refNode = await tx.nodeConhecimento.create({
          data: {
            grafoId: grafo.id,
            tipoNode: 'GRAFO_REF',
            referenciaId: filho.id,
            usuarioId: userId,
            posicaoX: centX,
            posicaoY: centY,
          },
        });

        // Redirecionar arestas externas para o GRAFO_REF
        for (const edge of externalEdges) {
          const srcIn = allNodeIds.includes(edge.nodeOrigemId ?? '');
          const tgtIn = allNodeIds.includes(edge.nodeDestinoId ?? '');
          await tx.conhecimentoAresta.update({
            where: { id: edge.id },
            data: {
              nodeOrigemId: srcIn ? refNode.id : edge.nodeOrigemId,
              nodeDestinoId: tgtIn ? refNode.id : edge.nodeDestinoId,
            },
          });
        }

        done++;
        console.log(
          `  [${done}/${baralhoNodes.length}] "${baralhoEntity.titulo}" → subgrafo ${filho.id} ` +
          `(${allNodes.length} nós, ${externalEdges.length} arestas externas)`,
        );
      });
    } catch (err) {
      console.error(`  [ERRO] Baralho "${baralhoEntity.titulo}":`, err.message);
      erros.push(baralhoEntity.titulo);
    }
  }

  console.log(`\nConcluído: ${done}/${baralhoNodes.length} baralhos divididos.`);
  if (erros.length > 0) console.warn(`Erros em ${erros.length} baralho(s):`, erros);
}

main()
  .catch((e) => { console.error('Erro fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
