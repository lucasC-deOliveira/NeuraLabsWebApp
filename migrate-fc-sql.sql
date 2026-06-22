-- Insere nós FLASHCARD + arestas CONTEM no grafo migracao via PL/pgSQL puro
DO $$
DECLARE
  r       record;
  fc      record;
  fc_count int;
  idx     int;
  cols    int;
  node_id text;
  edge_id text;
  px      float8;
  py      float8;
  total_nodes int := 0;
  total_edges int := 0;
BEGIN
  FOR r IN
    SELECT nc.id          AS node_id,
           nc.referencia_id AS baralho_id,
           nc.posicao_x   AS bx,
           nc.posicao_y   AS by_
    FROM "NodeConhecimento" nc
    WHERE nc.id_grafo  = 'cmqjkk1030001p120zy8yoe1t'
      AND nc."tipoNode" = 'BARALHO'
    ORDER BY nc.posicao_y, nc.posicao_x
  LOOP
    idx := 0;
    SELECT COUNT(*) INTO fc_count
    FROM "_BaralhoFlashcards" WHERE "A" = r.baralho_id;

    cols := LEAST(20, GREATEST(1, fc_count));

    FOR fc IN
      SELECT "B" AS fc_id
      FROM "_BaralhoFlashcards"
      WHERE "A" = r.baralho_id
      ORDER BY "B"
    LOOP
      -- Posição em grade abaixo do baralho, centralizada no eixo X
      px := r.bx + ((idx % cols) - (cols - 1) / 2.0) * 160.0;
      py := r.by_ + 350.0 + FLOOR(idx::float8 / cols) * 80.0;

      node_id := gen_random_uuid()::text;

      INSERT INTO "NodeConhecimento"
        (id, id_usuario, id_grafo, "tipoNode", referencia_id,
         posicao_x, posicao_y, nivel_dominio, ultima_atualizacao)
      VALUES
        (node_id,
         'cmqcruot20000o51zridfiw9v',
         'cmqjkk1030001p120zy8yoe1t',
         'FLASHCARD'::"TipoNode",
         fc.fc_id,
         px, py, 0.0, NOW())
      ON CONFLICT (id_usuario, id_grafo, "tipoNode", referencia_id)
        DO UPDATE SET ultima_atualizacao = EXCLUDED.ultima_atualizacao
      RETURNING id INTO node_id;          -- pega o id real (INSERT ou UPDATE)

      -- Aresta BARALHO → FLASHCARD
      edge_id := gen_random_uuid()::text;
      INSERT INTO "ConhecimentoAresta"
        (id, id_grafo, id_node_origem, id_node_destino, "tipoRelacao", peso)
      VALUES
        (edge_id,
         'cmqjkk1030001p120zy8yoe1t',
         r.node_id,
         node_id,
         'CONTEM'::"TipoRelacao",
         1.0)
      ON CONFLICT (id_node_origem, id_node_destino, "tipoRelacao") DO NOTHING;

      idx  := idx  + 1;
      total_nodes := total_nodes + 1;
      total_edges := total_edges + 1;
    END LOOP;

    RAISE NOTICE 'Baralho %: % flashcards inseridos', r.baralho_id, idx;
  END LOOP;

  RAISE NOTICE 'Concluído: % nós FLASHCARD + % arestas CONTEM', total_nodes, total_edges;
END $$;
