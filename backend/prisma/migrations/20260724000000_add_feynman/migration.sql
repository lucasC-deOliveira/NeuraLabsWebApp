-- CreateTable
CREATE TABLE "explicacoes_feynman" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "alvo_tipo" TEXT NOT NULL,
    "alvo_id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "clareza" INTEGER NOT NULL,
    "lacunas" JSONB,
    "jargao" JSONB,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "explicacoes_feynman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estados_feynman" (
    "id_usuario" TEXT NOT NULL,
    "alvo_tipo" TEXT NOT NULL,
    "alvo_id" TEXT NOT NULL,
    "ultima_clareza" INTEGER NOT NULL,
    "intervalo" INTEGER NOT NULL DEFAULT 0,
    "proxima_revisao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estados_feynman_pkey" PRIMARY KEY ("id_usuario","alvo_tipo","alvo_id")
);

-- CreateIndex
CREATE INDEX "explicacoes_feynman_id_usuario_alvo_tipo_alvo_id_idx" ON "explicacoes_feynman"("id_usuario", "alvo_tipo", "alvo_id");

-- AddForeignKey
ALTER TABLE "explicacoes_feynman" ADD CONSTRAINT "explicacoes_feynman_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estados_feynman" ADD CONSTRAINT "estados_feynman_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

