-- CreateEnum
CREATE TYPE "SubtipoNota" AS ENUM ('DEFINICAO', 'EXPLICACAO', 'EXEMPLO', 'COMPARACAO', 'SINTESE', 'PREREQUISITO', 'ERRO_COMUM', 'APLICACAO');

-- AlterTable: converte coluna TEXT existente para o enum (NULL para valores fora do enum)
ALTER TABLE "notas"
  ALTER COLUMN "subtipo" TYPE "SubtipoNota"
  USING CASE
    WHEN "subtipo" IN ('DEFINICAO','EXPLICACAO','EXEMPLO','COMPARACAO','SINTESE','PREREQUISITO','ERRO_COMUM','APLICACAO')
    THEN "subtipo"::"SubtipoNota"
    ELSE NULL
  END;
