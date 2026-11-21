import { Prisma } from '@prisma/client';
import type { AccountStorageCategory } from '../../../../../../contracts/account-storage';

const ownedTables: Record<AccountStorageCategory, readonly string[]> = {
  content: [
    'assuntos',
    'topicos',
    'conceitos',
    'questoes',
    'provas',
    'editais',
    'flashcards',
    'baralhos',
    'notas',
    'textos_brutos',
    'grafos_conhecimento',
    'NodeConhecimento',
  ],
  study: [
    'tentativas_prova',
    'sessoes_estudo',
    'AprendizadoFlashcard',
    'DesempenhoNo',
    'explicacoes_feynman',
    'estados_feynman',
    'planos_estudo',
    'roadmap_trilhas',
  ],
  account: ['ConfigAI'],
  technical: [
    'graph_view_cache',
    'duplicate_verdict_cache',
    'node_insights_cache',
    'node_embeddings',
  ],
};

function ownTableBytes(category: string, table: string, userId: string): Prisma.Sql {
  // Table identifiers come exclusively from the fixed schema list above.
  return Prisma.sql`
    SELECT ${category}::text AS category, SUM(octet_length(row_to_json(t)::text)) AS bytes
    FROM ${Prisma.raw(`"${table}"`)} AS t WHERE t.id_usuario = ${userId}
  `;
}

function linkedStudyBytes(userId: string): Prisma.Sql {
  return Prisma.sql`
    SELECT 'study' AS category, SUM(octet_length(row_to_json(r)::text)) AS bytes
    FROM revisoes_flashcard r JOIN sessoes_estudo s ON s.id = r.id_sessao
    WHERE s.id_usuario = ${userId}
    UNION ALL
    SELECT 'study', SUM(octet_length(row_to_json(r)::text))
    FROM respostas_questao r JOIN tentativas_prova t ON t.id = r.id_tentativa
    WHERE t.id_usuario = ${userId}
  `;
}

function linkedContentBytes(userId: string): Prisma.Sql {
  return Prisma.sql`
    SELECT 'content' AS category, SUM(octet_length(row_to_json(l)::text)) AS bytes
    FROM provas_questoes l JOIN provas p ON p.id = l.id_prova
    WHERE p.id_usuario = ${userId}
    UNION ALL
    SELECT 'content', SUM(octet_length(row_to_json(l)::text))
    FROM "_BaralhoFlashcards" l JOIN baralhos b ON b.id = l."A"
    WHERE b.id_usuario = ${userId}
    UNION ALL
    SELECT 'content', SUM(octet_length(row_to_json(l)::text))
    FROM grafo_nodes l JOIN grafos_conhecimento g ON g.id = l.id_grafo
    WHERE g.id_usuario = ${userId}
  `;
}

function ownedEdgeBytes(userId: string): Prisma.Sql {
  return Prisma.sql`
    SELECT 'content' AS category, SUM(octet_length(row_to_json(e)::text)) AS bytes
    FROM "ConhecimentoAresta" e
    LEFT JOIN "NodeConhecimento" n ON n.id = e.id_node_origem
    LEFT JOIN notas m ON m.id = e.id_nota_origem
    WHERE COALESCE(n.id_usuario, m.id_usuario) = ${userId}
  `;
}

function imageBytes(userId: string): Prisma.Sql {
  return Prisma.sql`
    SELECT 'content' AS category,
      SUM(octet_length(i.dados)::bigint + octet_length(row_to_json(
        ROW(i.id, i.id_questao, i.ordem, i.mimetype, i.alternativa)
      )::text))::bigint AS bytes
    FROM questoes_imagens i JOIN questoes q ON q.id = i.id_questao
    WHERE q.id_usuario = ${userId}
  `;
}

function profileBytes(userId: string): Prisma.Sql {
  return Prisma.sql`
    SELECT 'account' AS category, SUM(octet_length(row_to_json(u)::text)) AS bytes
    FROM usuarios u WHERE u.id = ${userId}
  `;
}

/** Measures logical bytes by category without reading account records into the application.
 * @example prisma.$queryRaw(accountStorageSql(userId))
 */
export function accountStorageSql(userId: string): Prisma.Sql {
  const owned = Object.entries(ownedTables).flatMap(([category, tables]) =>
    tables.map((table) => ownTableBytes(category, table, userId)),
  );
  const subqueries = [
    profileBytes(userId),
    ...owned,
    linkedStudyBytes(userId),
    linkedContentBytes(userId),
    ownedEdgeBytes(userId),
    imageBytes(userId),
  ];
  return Prisma.sql`
    SELECT category, COALESCE(SUM(bytes), 0)::bigint AS bytes
    FROM (${Prisma.join(subqueries, ' UNION ALL ')}) AS storage_rows
    GROUP BY category
  `;
}
