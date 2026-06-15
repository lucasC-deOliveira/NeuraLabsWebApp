-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoNode" AS ENUM ('ASSUNTO', 'TOPICO', 'CONCEITO', 'FLASHCARD', 'NOTA', 'TEXTO_BRUTO', 'BARALHO', 'QUESTION');

-- CreateEnum
CREATE TYPE "TipoRelacao" AS ENUM ('GERA', 'REFERENCIA', 'DEFINE', 'EXPLICA', 'APROFUNDA', 'EXEMPLIFICA', 'CONTRASTA', 'SINTETIZA', 'ALERTA_ERRO', 'IS_A', 'PART_OF', 'PREREQUISITO', 'DERIVA_DE', 'EVOLUI_PARA', 'REFORCA', 'RELACIONADO', 'TESTA', 'TESTA_DEFINICAO', 'PERTENCE_A', 'SUBTOPICO_DE', 'DEPENDE_DE', 'FUNDAMENTA', 'APLICADO_EM', 'ALTERNATIVA_A', 'CONTRASTA_COM', 'CONFUNDE_COM', 'ANTI_PADRAO_DE', 'MEDIDO_POR', 'OBJETIVO_DE', 'HERDA', 'CONTEM', 'COMPLEMENTAR');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_acesso" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assuntos" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "assuntos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topicos" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "id_assunto" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "topicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conceitos" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "id_topico" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "conceitos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcards" (
    "id" TEXT NOT NULL,
    "id_concept" TEXT,
    "id_usuario" TEXT NOT NULL,
    "pergunta" TEXT NOT NULL,
    "resposta" TEXT NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baralhos" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "baralhos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT 'Sem título',
    "tipo_nota" TEXT NOT NULL DEFAULT 'PERMANENTE',
    "subtipo" TEXT,
    "fonte" TEXT,
    "slug" TEXT,
    "conteudo" TEXT NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "textos_brutos" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT 'Texto sem título',
    "texto" TEXT NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "textos_brutos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grafos_conhecimento" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "estado_visual" TEXT,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grafos_conhecimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeConhecimento" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "id_grafo" TEXT,
    "tipoNode" "TipoNode" NOT NULL,
    "referencia_id" TEXT NOT NULL,
    "posicao_x" DOUBLE PRECISION DEFAULT 0.0,
    "posicao_y" DOUBLE PRECISION DEFAULT 0.0,
    "nivel_dominio" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "ultima_atualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NodeConhecimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConhecimentoAresta" (
    "id" TEXT NOT NULL,
    "id_grafo" TEXT,
    "id_node_origem" TEXT,
    "id_node_destino" TEXT,
    "id_nota_origem" TEXT,
    "id_nota_destino" TEXT,
    "tipoRelacao" "TipoRelacao" NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "ConhecimentoAresta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes_estudo" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "data_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_fim" TIMESTAMP(3),

    CONSTRAINT "sessoes_estudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revisoes_flashcard" (
    "id" TEXT NOT NULL,
    "id_flashcard" TEXT NOT NULL,
    "id_sessao" TEXT NOT NULL,
    "resposta_usuario" TEXT,
    "acertou" BOOLEAN NOT NULL,
    "nivel_confianca" INTEGER NOT NULL DEFAULT 3,
    "tipo_erro" TEXT,
    "tempo_resposta" INTEGER,

    CONSTRAINT "revisoes_flashcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AprendizadoFlashcard" (
    "id_flashcard" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "dificuldade" INTEGER NOT NULL DEFAULT 5,
    "intervalo" INTEGER NOT NULL DEFAULT 0,
    "fator_ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "fase" TEXT NOT NULL DEFAULT 'LEARN',
    "learning_step" INTEGER NOT NULL DEFAULT 0,
    "proxima_revisao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_revisao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estagio_aprendizado" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AprendizadoFlashcard_pkey" PRIMARY KEY ("id_flashcard","id_usuario")
);

-- CreateTable
CREATE TABLE "DesempenhoNo" (
    "id_usuario" TEXT NOT NULL,
    "id_node" TEXT NOT NULL,
    "taxaAcerto" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "confiancaMedia" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "prioridadeRevisao" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "DesempenhoNo_pkey" PRIMARY KEY ("id_usuario","id_node")
);

-- CreateTable
CREATE TABLE "ConfigAI" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,

    CONSTRAINT "ConfigAI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "storage_mode" TEXT NOT NULL DEFAULT 'DATABASE',
    "vault_path" TEXT,
    "google_client_id" TEXT,
    "google_client_secret" TEXT,
    "github_client_id" TEXT,
    "github_client_secret" TEXT,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BaralhoFlashcards" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BaralhoFlashcards_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NodeConhecimento_id_usuario_id_grafo_tipoNode_referencia_id_key" ON "NodeConhecimento"("id_usuario", "id_grafo", "tipoNode", "referencia_id");

-- CreateIndex
CREATE UNIQUE INDEX "ConhecimentoAresta_id_node_origem_id_node_destino_tipoRelac_key" ON "ConhecimentoAresta"("id_node_origem", "id_node_destino", "tipoRelacao");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigAI_id_usuario_key" ON "ConfigAI"("id_usuario");

-- CreateIndex
CREATE INDEX "_BaralhoFlashcards_B_index" ON "_BaralhoFlashcards"("B");

-- AddForeignKey
ALTER TABLE "assuntos" ADD CONSTRAINT "assuntos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topicos" ADD CONSTRAINT "topicos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topicos" ADD CONSTRAINT "topicos_id_assunto_fkey" FOREIGN KEY ("id_assunto") REFERENCES "assuntos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceitos" ADD CONSTRAINT "conceitos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceitos" ADD CONSTRAINT "conceitos_id_topico_fkey" FOREIGN KEY ("id_topico") REFERENCES "topicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_id_concept_fkey" FOREIGN KEY ("id_concept") REFERENCES "conceitos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baralhos" ADD CONSTRAINT "baralhos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textos_brutos" ADD CONSTRAINT "textos_brutos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grafos_conhecimento" ADD CONSTRAINT "grafos_conhecimento_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeConhecimento" ADD CONSTRAINT "NodeConhecimento_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeConhecimento" ADD CONSTRAINT "NodeConhecimento_id_grafo_fkey" FOREIGN KEY ("id_grafo") REFERENCES "grafos_conhecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConhecimentoAresta" ADD CONSTRAINT "ConhecimentoAresta_id_grafo_fkey" FOREIGN KEY ("id_grafo") REFERENCES "grafos_conhecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConhecimentoAresta" ADD CONSTRAINT "ConhecimentoAresta_id_node_origem_fkey" FOREIGN KEY ("id_node_origem") REFERENCES "NodeConhecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConhecimentoAresta" ADD CONSTRAINT "ConhecimentoAresta_id_node_destino_fkey" FOREIGN KEY ("id_node_destino") REFERENCES "NodeConhecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConhecimentoAresta" ADD CONSTRAINT "ConhecimentoAresta_id_nota_origem_fkey" FOREIGN KEY ("id_nota_origem") REFERENCES "notas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConhecimentoAresta" ADD CONSTRAINT "ConhecimentoAresta_id_nota_destino_fkey" FOREIGN KEY ("id_nota_destino") REFERENCES "notas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes_estudo" ADD CONSTRAINT "sessoes_estudo_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisoes_flashcard" ADD CONSTRAINT "revisoes_flashcard_id_flashcard_fkey" FOREIGN KEY ("id_flashcard") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisoes_flashcard" ADD CONSTRAINT "revisoes_flashcard_id_sessao_fkey" FOREIGN KEY ("id_sessao") REFERENCES "sessoes_estudo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AprendizadoFlashcard" ADD CONSTRAINT "AprendizadoFlashcard_id_flashcard_fkey" FOREIGN KEY ("id_flashcard") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AprendizadoFlashcard" ADD CONSTRAINT "AprendizadoFlashcard_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesempenhoNo" ADD CONSTRAINT "DesempenhoNo_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesempenhoNo" ADD CONSTRAINT "DesempenhoNo_id_node_fkey" FOREIGN KEY ("id_node") REFERENCES "NodeConhecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigAI" ADD CONSTRAINT "ConfigAI_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BaralhoFlashcards" ADD CONSTRAINT "_BaralhoFlashcards_A_fkey" FOREIGN KEY ("A") REFERENCES "baralhos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BaralhoFlashcards" ADD CONSTRAINT "_BaralhoFlashcards_B_fkey" FOREIGN KEY ("B") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
