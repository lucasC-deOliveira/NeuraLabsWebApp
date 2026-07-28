-- Additive: indexes for the study-plan "today" hot path (no data change).
-- Due-review count/list for a user without scanning all of their cards.
CREATE INDEX "AprendizadoFlashcard_id_usuario_proxima_revisao_idx" ON "AprendizadoFlashcard"("id_usuario", "proxima_revisao");

-- Edge lookups by destination (card/question → concept); the unique leads by origin.
CREATE INDEX "ConhecimentoAresta_id_node_destino_idx" ON "ConhecimentoAresta"("id_node_destino");
