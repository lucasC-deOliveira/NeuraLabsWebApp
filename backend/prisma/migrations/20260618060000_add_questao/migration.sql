-- CreateEnum
CREATE TYPE "TipoQuestao" AS ENUM ('VERDADEIRO_FALSO', 'MULTIPLA_ESCOLHA');

-- CreateTable
CREATE TABLE "questoes" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "id_conceito" TEXT,
    "tipo" "TipoQuestao" NOT NULL,
    "enunciado" TEXT NOT NULL,
    "alternativas" JSONB,
    "gabarito" TEXT NOT NULL,
    "explicacao" TEXT,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "questoes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "questoes" ADD CONSTRAINT "questoes_id_usuario_fkey"
    FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questoes" ADD CONSTRAINT "questoes_id_conceito_fkey"
    FOREIGN KEY ("id_conceito") REFERENCES "conceitos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Remove VERDADEIRO_FALSO and MULTIPLA_ESCOLHA from TipoFlashcard
-- PostgreSQL doesn't support DROP VALUE, so we recreate the type
ALTER TYPE "TipoFlashcard" RENAME TO "TipoFlashcard_old";

CREATE TYPE "TipoFlashcard" AS ENUM (
    'DEFINICAO', 'EXPLICACAO', 'EXEMPLO', 'APLICACAO',
    'CONTRASTE', 'COMPLETAR', 'ORDENACAO', 'RELACIONAL', 'ERRO_COMUM'
);

ALTER TABLE "flashcards"
    ALTER COLUMN "tipo" TYPE "TipoFlashcard"
    USING CASE
        WHEN "tipo"::text IN ('VERDADEIRO_FALSO', 'MULTIPLA_ESCOLHA') THEN NULL
        WHEN "tipo" IS NULL THEN NULL
        ELSE "tipo"::text::"TipoFlashcard"
    END;

DROP TYPE "TipoFlashcard_old";
