-- Um grafo de conhecimento por usuário — o master — e todo o resto como subgrafo.
--
-- Por quê: o app passa a ter UM grafo (o master) e tudo o mais pendura nele. O
-- código já cria grafo novo como subgrafo; este script arruma o que já existe.
-- Hoje há 10 raízes por usuário: um deles ("migracao") já é o master de fato (tem
-- 33 GRAFO_REF, os grandes penduram nele); os outros 9 são raízes soltos.
--
-- O que faz, por usuário:
--   1. Elege o master = o raiz com mais nós (empate → mais antigo) e o renomeia.
--   2. Cada OUTRO raiz vira subgrafo do master: ganha parent + um nó GRAFO_REF
--      contido no master (a "tile" do subgrafo), como o createSubgraph faz.
--
-- Não apaga nada. Idempotente: rodar de novo não acha mais raiz sobrando.
--
-- Uso:
--   docker compose exec -T postgres psql -U neuralabs -d neuralabs < dobra-tudo-sob-master.sql

BEGIN;

-- Master por usuário: o raiz que já é o topo de fato — o que tem mais SUBGRAFOS.
-- (Antes eu elegia por nº de nós, e um grafo grande sem filhos roubava o posto de
--  um menor que já continha 33 subgrafos.) Empate → mais nós → mais antigo.
CREATE TEMP TABLE _master AS
SELECT DISTINCT ON (g.id_usuario) g.id_usuario, g.id AS master_id
FROM grafos_conhecimento g
WHERE g.parent_grafo_id IS NULL
ORDER BY g.id_usuario,
         (SELECT count(*) FROM grafos_conhecimento f WHERE f.parent_grafo_id = g.id) DESC,
         (SELECT count(*) FROM grafo_nodes gn WHERE gn.id_grafo = g.id) DESC,
         g.data_criacao ASC;

-- 1) Renomeia o master.
UPDATE grafos_conhecimento g
SET nome = 'Meu Conhecimento', data_atualizacao = now()
FROM _master m
WHERE g.id = m.master_id;

-- Os órfãos: raízes que não são o master do seu dono.
CREATE TEMP TABLE _orfaos AS
SELECT g.id AS orfao_id, m.master_id, g.id_usuario
FROM grafos_conhecimento g
JOIN _master m ON m.id_usuario = g.id_usuario
WHERE g.parent_grafo_id IS NULL AND g.id <> m.master_id;

-- 2a) Cada órfão passa a ter o master como pai.
UPDATE grafos_conhecimento g
SET parent_grafo_id = o.master_id,
    tipo_relacao_pai = 'RELACIONADO',
    data_atualizacao = now()
FROM _orfaos o
WHERE g.id = o.orfao_id;

-- 2b) Cria a "tile" do subgrafo: um nó GRAFO_REF (referência = id do órfão)
--     pertencente ao dono, e a contenção dele no master. Posições em grade para
--     não empilharem na origem. Só cria o que ainda não existe (idempotente).
WITH novos AS (
  SELECT o.orfao_id, o.master_id, o.id_usuario,
         row_number() OVER (PARTITION BY o.master_id ORDER BY o.orfao_id) AS rn
  FROM _orfaos o
  WHERE NOT EXISTS (
    SELECT 1 FROM "NodeConhecimento" n
    JOIN grafo_nodes gn ON gn.id_node = n.id AND gn.id_grafo = o.master_id
    WHERE n."tipoNode" = 'GRAFO_REF' AND n.referencia_id = o.orfao_id
  )
), inseridos AS (
  INSERT INTO "NodeConhecimento" (id, id_usuario, "tipoNode", referencia_id, nivel_dominio, ultima_atualizacao)
  SELECT gen_random_uuid()::text, n.id_usuario, 'GRAFO_REF', n.orfao_id, 0, now()
  FROM novos n
  RETURNING id, referencia_id
)
INSERT INTO grafo_nodes (id_grafo, id_node, posicao_x, posicao_y, data_criacao)
SELECT o.master_id, i.id,
       (n.rn % 6) * 250.0, (n.rn / 6) * 250.0, now()
FROM inseridos i
JOIN _orfaos o ON o.orfao_id = i.referencia_id
JOIN novos n ON n.orfao_id = i.referencia_id;

-- Invariante: exatamente um raiz por usuário.
DO $$
DECLARE extras INT;
BEGIN
  SELECT count(*) INTO extras FROM (
    SELECT id_usuario FROM grafos_conhecimento WHERE parent_grafo_id IS NULL
    GROUP BY id_usuario HAVING count(*) > 1
  ) x;
  IF extras > 0 THEN
    RAISE EXCEPTION '% usuario(s) ainda com mais de um raiz', extras;
  END IF;
  RAISE NOTICE 'ok: um raiz por usuario';
END $$;

COMMIT;
