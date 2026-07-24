-- Additive: per-angle Feynman explanations (SIMPLES | ANALOGIA | TECNICO).
-- Nullable so existing rows (single-angle/legacy) stay valid — no reset.
ALTER TABLE "explicacoes_feynman" ADD COLUMN "angulo" TEXT;
