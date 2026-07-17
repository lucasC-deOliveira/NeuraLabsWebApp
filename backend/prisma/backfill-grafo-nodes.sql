-- Backfill: popula grafo_nodes (a contenção) a partir de NodeConhecimento.id_grafo.
--
-- Por quê: o nó vai deixar de pertencer a UM grafo e passar a ser do sistema, único
-- por (usuário, tipo, referência); grafos e subgrafos apenas o contêm. Enquanto a
-- taxonomia é global (o catálogo do classificador lê só por usuário) e o nó é por
-- grafo, não existe aresta possível entre um flashcard do grafo "NODEJS" e o
-- conceito "Dijkstra" que vive no grafo "Algoritmos" — é o que trava a
-- classificação do acervo (só 2,5% dos flashcards têm conceito).
--
-- Fase 1 da migração: ADITIVO. id_grafo continua sendo a fonte da verdade; nada lê
-- esta tabela ainda. A posição vem junto porque ela é da vista, não do nó.
--
-- Idempotente: ON CONFLICT DO NOTHING. Pode rodar quantas vezes quiser.
--
-- Uso:
--   docker compose exec -T postgres psql -U neuralabs -d neuralabs < backfill-grafo-nodes.sql

BEGIN;

INSERT INTO grafo_nodes (id_grafo, id_node, posicao_x, posicao_y, data_criacao)
SELECT n.id_grafo, n.id, n.posicao_x, n.posicao_y, now()
FROM "NodeConhecimento" n
WHERE n.id_grafo IS NOT NULL
ON CONFLICT (id_grafo, id_node) DO NOTHING;

-- Invariante: toda linha de nó com grafo virou exatamente uma contenção.
DO $$
DECLARE
  nos_com_grafo INT;
  contencoes    INT;
BEGIN
  SELECT count(*) INTO nos_com_grafo FROM "NodeConhecimento" WHERE id_grafo IS NOT NULL;
  SELECT count(*) INTO contencoes FROM grafo_nodes;
  IF nos_com_grafo <> contencoes THEN
    RAISE EXCEPTION 'backfill divergente: % nos com grafo, % contencoes', nos_com_grafo, contencoes;
  END IF;
  RAISE NOTICE 'ok: % contencoes criadas a partir de % nos', contencoes, nos_com_grafo;
END $$;

COMMIT;
