-- Merge: funde as linhas de nó que apontam para a MESMA entidade.
--
-- Rode ANTES do `prisma db push` que troca a unique do nó para
-- (usuário, tipo, referência) — com duplicatas no banco, o índice não sobe.
--
-- Por quê: até agora a unique incluía o grafo, então a mesma entidade precisava de
-- uma linha por grafo — e clonar o conceito era a única forma de ligá-lo a conteúdo
-- de outro grafo. Com o nó do sistema, essas linhas viram uma só e os grafos apenas
-- a contêm.
--
-- Medido antes de escrever: 11 duplicatas, todas CONCEITO, e ZERO colisão de aresta
-- (15.888 → 15.888). A aresta já era única por (origem, destino, tipoRelacao), sem
-- o grafo.
--
-- Idempotente: rodar de novo não acha duplicata e não faz nada.
--
-- Uso:
--   docker compose exec -T postgres psql -U neuralabs -d neuralabs < merge-nos-duplicados.sql

BEGIN;

-- Sobrevivente por entidade: o nó de menor id (ordem estável).
CREATE TEMP TABLE _merge_plan AS
SELECT n.id AS perdedor, s.sobrevivente
FROM "NodeConhecimento" n
JOIN (
  SELECT id_usuario, "tipoNode", referencia_id, min(id) AS sobrevivente
  FROM "NodeConhecimento"
  GROUP BY 1, 2, 3
  HAVING count(*) > 1
) s ON s.id_usuario = n.id_usuario
   AND s."tipoNode" = n."tipoNode"
   AND s.referencia_id = n.referencia_id
WHERE n.id <> s.sobrevivente;

-- 1) A contenção do perdedor passa ao sobrevivente: o grafo continua mostrando o
--    nó. ON CONFLICT: se o sobrevivente já está naquele grafo, nada a fazer.
INSERT INTO grafo_nodes (id_grafo, id_node, posicao_x, posicao_y, data_criacao)
SELECT gn.id_grafo, p.sobrevivente, gn.posicao_x, gn.posicao_y, gn.data_criacao
FROM grafo_nodes gn JOIN _merge_plan p ON p.perdedor = gn.id_node
ON CONFLICT (id_grafo, id_node) DO NOTHING;

-- 2) As arestas do perdedor passam ao sobrevivente. A unique da aresta é
--    (origem, destino, tipoRelacao): se a mesma aresta já existir no sobrevivente,
--    a do perdedor é descartada em vez de violar a chave.
DELETE FROM "ConhecimentoAresta" a
USING _merge_plan p
WHERE a.id_node_origem = p.perdedor
  AND EXISTS (
    SELECT 1 FROM "ConhecimentoAresta" b
    WHERE b.id_node_origem = p.sobrevivente
      AND b.id_node_destino = a.id_node_destino
      AND b."tipoRelacao" = a."tipoRelacao");

DELETE FROM "ConhecimentoAresta" a
USING _merge_plan p
WHERE a.id_node_destino = p.perdedor
  AND EXISTS (
    SELECT 1 FROM "ConhecimentoAresta" b
    WHERE b.id_node_destino = p.sobrevivente
      AND b.id_node_origem = a.id_node_origem
      AND b."tipoRelacao" = a."tipoRelacao");

UPDATE "ConhecimentoAresta" a SET id_node_origem = p.sobrevivente
FROM _merge_plan p WHERE a.id_node_origem = p.perdedor;

UPDATE "ConhecimentoAresta" a SET id_node_destino = p.sobrevivente
FROM _merge_plan p WHERE a.id_node_destino = p.perdedor;

-- 3) O desempenho é do usuário sobre o nó: o do perdedor vai junto (a tabela está
--    vazia hoje, mas o merge não pode depender disso).
INSERT INTO "DesempenhoNo" (id_usuario, id_node, "taxaAcerto", "confiancaMedia", "prioridadeRevisao")
SELECT d.id_usuario, p.sobrevivente, d."taxaAcerto", d."confiancaMedia", d."prioridadeRevisao"
FROM "DesempenhoNo" d JOIN _merge_plan p ON p.perdedor = d.id_node
ON CONFLICT (id_usuario, id_node) DO NOTHING;

-- 4) O perdedor sai. O cascade leva contenção/arestas/desempenho remanescentes.
DELETE FROM "NodeConhecimento" n USING _merge_plan p WHERE n.id = p.perdedor;

-- Invariante: nenhuma entidade com mais de uma linha de nó — é o que a unique nova
-- vai cobrar.
DO $$
DECLARE dups INT;
BEGIN
  SELECT count(*) INTO dups FROM (
    SELECT 1 FROM "NodeConhecimento" GROUP BY id_usuario, "tipoNode", referencia_id HAVING count(*) > 1
  ) x;
  IF dups > 0 THEN
    RAISE EXCEPTION 'ainda existem % entidades com no duplicado', dups;
  END IF;
  RAISE NOTICE 'ok: nenhum no duplicado';
END $$;

COMMIT;
