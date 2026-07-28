-- Additive: study plan per objective (graph + roadmap priority). Nothing on existing tables.
-- CreateTable
CREATE TABLE "planos_estudo" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "id_grafo" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL,
    "meta_tipo" TEXT NOT NULL,
    "meta_valor" INTEGER NOT NULL,
    "data_alvo" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planos_estudo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planos_estudo_id_usuario_idx" ON "planos_estudo"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "planos_estudo_id_usuario_id_grafo_prioridade_key" ON "planos_estudo"("id_usuario", "id_grafo", "prioridade");

-- AddForeignKey
ALTER TABLE "planos_estudo" ADD CONSTRAINT "planos_estudo_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_estudo" ADD CONSTRAINT "planos_estudo_id_grafo_fkey" FOREIGN KEY ("id_grafo") REFERENCES "grafos_conhecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
