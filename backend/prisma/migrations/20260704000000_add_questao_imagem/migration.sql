-- CreateTable
CREATE TABLE "questoes_imagens" (
    "id" TEXT NOT NULL,
    "id_questao" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "mimetype" TEXT NOT NULL,
    "dados" BYTEA NOT NULL,

    CONSTRAINT "questoes_imagens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questoes_imagens_id_questao_idx" ON "questoes_imagens"("id_questao");

-- AddForeignKey
ALTER TABLE "questoes_imagens" ADD CONSTRAINT "questoes_imagens_id_questao_fkey" FOREIGN KEY ("id_questao") REFERENCES "questoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
