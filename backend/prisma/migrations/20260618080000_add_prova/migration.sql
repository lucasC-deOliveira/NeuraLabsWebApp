-- CreateTable Prova
CREATE TABLE "provas" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "provas_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProvaQuestao
CREATE TABLE "provas_questoes" (
    "id" TEXT NOT NULL,
    "id_prova" TEXT NOT NULL,
    "id_questao" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "provas_questoes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey Prova → Usuario
ALTER TABLE "provas" ADD CONSTRAINT "provas_id_usuario_fkey"
    FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey ProvaQuestao → Prova
ALTER TABLE "provas_questoes" ADD CONSTRAINT "provas_questoes_id_prova_fkey"
    FOREIGN KEY ("id_prova") REFERENCES "provas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey ProvaQuestao → Questao
ALTER TABLE "provas_questoes" ADD CONSTRAINT "provas_questoes_id_questao_fkey"
    FOREIGN KEY ("id_questao") REFERENCES "questoes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- UniqueIndex
CREATE UNIQUE INDEX "provas_questoes_id_prova_id_questao_key"
    ON "provas_questoes"("id_prova", "id_questao");
