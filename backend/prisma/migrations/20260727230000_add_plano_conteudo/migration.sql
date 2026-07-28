-- Additive: plan content curation (sources + concept exclusions). Nullable JSON arrays.
ALTER TABLE "planos_estudo" ADD COLUMN "baralho_ids" JSONB;
ALTER TABLE "planos_estudo" ADD COLUMN "prova_ids" JSONB;
ALTER TABLE "planos_estudo" ADD COLUMN "conceitos_excluidos" JSONB;
