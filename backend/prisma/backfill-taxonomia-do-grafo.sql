-- Backfill: preenche a hierarquia relacional (Conceito.id_topico, Topico.id_assunto)
-- a partir das arestas PERTENCE_A que já existem no grafo.
--
-- Por quê: o importador de grafo (src/graph/graph-import.ts) criava conceitos e
-- tópicos SEM pai, colocando a hierarquia apenas nas arestas. Resultado: 532 de 533
-- conceitos ficaram com id_topico nulo, e quem lê a taxonomia pelo relacional (filtros
-- de flashcard, árvore de conceitos) via tudo vazio. O importador já foi corrigido
-- para gravar os dois; isto conserta o que ele deixou para trás.
--
-- Idempotente: só toca em linhas com o pai nulo, e pode ser rodado de novo à vontade.
-- Um conceito com nó em vários grafos recebe o pai de um deles (qualquer um serve —
-- o mesmo critério do leitor, que usa o primeiro nó que tiver hierarquia).
--
-- Uso:
--   docker compose exec -T postgres psql -U neuralabs -d neuralabs \
--     -f /dev/stdin < backend/prisma/backfill-taxonomia-do-grafo.sql

BEGIN;

-- CONCEITO --PERTENCE_A--> TOPICO
UPDATE conceitos c
SET id_topico = origem.topico_id
FROM (
  SELECT DISTINCT ON (no_.referencia_id)
    no_.referencia_id AS conceito_id,
    nd.referencia_id  AS topico_id
  FROM "ConhecimentoAresta" a
  JOIN "NodeConhecimento" no_ ON no_.id = a.id_node_origem AND no_."tipoNode" = 'CONCEITO'
  JOIN "NodeConhecimento" nd  ON nd.id  = a.id_node_destino AND nd."tipoNode" = 'TOPICO'
  WHERE a."tipoRelacao" = 'PERTENCE_A'
) AS origem
WHERE c.id = origem.conceito_id
  AND c.id_topico IS NULL
  AND EXISTS (SELECT 1 FROM topicos t WHERE t.id = origem.topico_id);

-- TOPICO --PERTENCE_A--> ASSUNTO
UPDATE topicos t
SET id_assunto = origem.assunto_id
FROM (
  SELECT DISTINCT ON (no_.referencia_id)
    no_.referencia_id AS topico_id,
    nd.referencia_id  AS assunto_id
  FROM "ConhecimentoAresta" a
  JOIN "NodeConhecimento" no_ ON no_.id = a.id_node_origem AND no_."tipoNode" = 'TOPICO'
  JOIN "NodeConhecimento" nd  ON nd.id  = a.id_node_destino AND nd."tipoNode" = 'ASSUNTO'
  WHERE a."tipoRelacao" = 'PERTENCE_A'
) AS origem
WHERE t.id = origem.topico_id
  AND t.id_assunto IS NULL
  AND EXISTS (SELECT 1 FROM assuntos a2 WHERE a2.id = origem.assunto_id);

COMMIT;
