-- CreateTable
CREATE TABLE "tentativas_prova" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "id_prova" TEXT NOT NULL,
    "data_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_fim" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acertos" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "tempo_total_ms" INTEGER NOT NULL,

    CONSTRAINT "tentativas_prova_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respostas_questao" (
    "id" TEXT NOT NULL,
    "id_tentativa" TEXT NOT NULL,
    "id_questao" TEXT NOT NULL,
    "resposta_escolhida" TEXT NOT NULL,
    "acertou" BOOLEAN NOT NULL,
    "tempo_resposta_ms" INTEGER,

    CONSTRAINT "respostas_questao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tentativas_prova_id_usuario_id_prova_idx" ON "tentativas_prova"("id_usuario", "id_prova");

-- CreateIndex
CREATE INDEX "respostas_questao_id_tentativa_idx" ON "respostas_questao"("id_tentativa");

-- AddForeignKey
ALTER TABLE "tentativas_prova" ADD CONSTRAINT "tentativas_prova_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tentativas_prova" ADD CONSTRAINT "tentativas_prova_id_prova_fkey" FOREIGN KEY ("id_prova") REFERENCES "provas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas_questao" ADD CONSTRAINT "respostas_questao_id_tentativa_fkey" FOREIGN KEY ("id_tentativa") REFERENCES "tentativas_prova"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas_questao" ADD CONSTRAINT "respostas_questao_id_questao_fkey" FOREIGN KEY ("id_questao") REFERENCES "questoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

