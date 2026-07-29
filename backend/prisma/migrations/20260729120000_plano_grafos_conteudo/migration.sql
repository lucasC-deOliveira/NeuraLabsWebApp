-- Grafo deixa de ser "objetivo" e vira conteúdo (multi). O objetivo é sempre
-- aprender todo o conteúdo escolhido. Aditivo + relaxa a coluna/constraint antigas.

-- Grafos escolhidos como conteúdo (array de ids em JSON, como baralho_ids/prova_ids).
ALTER TABLE "planos_estudo" ADD COLUMN "grafo_ids" JSONB;

-- A identidade do plano passa a ser o id (o usuário já pode ter vários planos):
-- cai o unique por (usuário, grafo, prioridade).
DROP INDEX IF EXISTS "planos_estudo_id_usuario_id_grafo_prioridade_key";

-- O grafo-objetivo foi aposentado; a coluna vira nullable (legado/back-compat).
ALTER TABLE "planos_estudo" ALTER COLUMN "id_grafo" DROP NOT NULL;

-- Backfill: planos antigos preservam o grafo-objetivo como "1 grafo no conteúdo".
UPDATE "planos_estudo"
SET "grafo_ids" = jsonb_build_array("id_grafo")
WHERE "id_grafo" IS NOT NULL AND "grafo_ids" IS NULL;
