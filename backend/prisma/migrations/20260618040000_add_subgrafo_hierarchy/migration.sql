-- AlterEnum
ALTER TYPE "TipoNode" ADD VALUE 'GRAFO_REF';

-- AlterTable
ALTER TABLE "grafos_conhecimento"
  ADD COLUMN "parent_grafo_id" TEXT,
  ADD COLUMN "tipo_relacao_pai" TEXT;

-- AddForeignKey
ALTER TABLE "grafos_conhecimento"
  ADD CONSTRAINT "grafos_conhecimento_parent_grafo_id_fkey"
  FOREIGN KEY ("parent_grafo_id") REFERENCES "grafos_conhecimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
