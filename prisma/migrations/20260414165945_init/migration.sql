-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "data_criacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_acesso" DATETIME
);

-- CreateTable
CREATE TABLE "assuntos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "id_usuario" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    CONSTRAINT "assuntos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "topicos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "id_subject" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    CONSTRAINT "topicos_id_subject_fkey" FOREIGN KEY ("id_subject") REFERENCES "assuntos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conceitos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "id_topic" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    CONSTRAINT "conceitos_id_topic_fkey" FOREIGN KEY ("id_topic") REFERENCES "topicos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "flashcards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "id_concept" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "pergunta" TEXT NOT NULL,
    "resposta" TEXT NOT NULL,
    "data_criacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flashcards_id_concept_fkey" FOREIGN KEY ("id_concept") REFERENCES "conceitos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "flashcards_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sessoes_estudo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "id_usuario" TEXT NOT NULL,
    "data_inicio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_fim" DATETIME,
    CONSTRAINT "sessoes_estudo_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "revisoes_flashcard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "id_flashcard" TEXT NOT NULL,
    "id_sessao" TEXT NOT NULL,
    "resposta_usuario" TEXT,
    "acertou" BOOLEAN NOT NULL,
    "nivel_confianca" INTEGER NOT NULL DEFAULT 3,
    "tipo_erro" TEXT,
    "tempo_resposta" INTEGER,
    CONSTRAINT "revisoes_flashcard_id_flashcard_fkey" FOREIGN KEY ("id_flashcard") REFERENCES "flashcards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "revisoes_flashcard_id_sessao_fkey" FOREIGN KEY ("id_sessao") REFERENCES "sessoes_estudo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "aprendizado_flashcard" (
    "id_flashcard" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "dificuldade" INTEGER NOT NULL DEFAULT 5,
    "intervalo" INTEGER NOT NULL DEFAULT 0,
    "proxima_revisao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_revisao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estagio_aprendizado" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("id_flashcard", "id_usuario"),
    CONSTRAINT "aprendizado_flashcard_id_flashcard_fkey" FOREIGN KEY ("id_flashcard") REFERENCES "flashcards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "aprendizado_flashcard_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "id_usuario" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "data_criacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notas_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "grafos_conhecimento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "id_usuario" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "estado_visual" TEXT,
    "data_criacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "grafos_conhecimento_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NodeConhecimento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "id_usuario" TEXT NOT NULL,
    "id_grafo" TEXT,
    "tipoNode" TEXT NOT NULL,
    "referencia_id" TEXT NOT NULL,
    "posicao_x" REAL DEFAULT 0.0,
    "posicao_y" REAL DEFAULT 0.0,
    "nivel_dominio" REAL NOT NULL DEFAULT 0.0,
    "ultima_atualizacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NodeConhecimento_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NodeConhecimento_id_grafo_fkey" FOREIGN KEY ("id_grafo") REFERENCES "grafos_conhecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConhecimentoAresta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "id_grafo" TEXT,
    "id_node_origem" TEXT,
    "id_node_destino" TEXT,
    "id_nota_origem" TEXT,
    "id_nota_destino" TEXT,
    "tipoRelacao" TEXT NOT NULL,
    "peso" REAL NOT NULL DEFAULT 1.0,
    CONSTRAINT "ConhecimentoAresta_id_grafo_fkey" FOREIGN KEY ("id_grafo") REFERENCES "grafos_conhecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConhecimentoAresta_id_node_origem_fkey" FOREIGN KEY ("id_node_origem") REFERENCES "NodeConhecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConhecimentoAresta_id_node_destino_fkey" FOREIGN KEY ("id_node_destino") REFERENCES "NodeConhecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConhecimentoAresta_id_nota_origem_fkey" FOREIGN KEY ("id_nota_origem") REFERENCES "notas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConhecimentoAresta_id_nota_destino_fkey" FOREIGN KEY ("id_nota_destino") REFERENCES "notas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "desempenho_no" (
    "id_usuario" TEXT NOT NULL,
    "id_node" TEXT NOT NULL,
    "taxa_acerto" REAL NOT NULL DEFAULT 0.0,
    "confianca_media" REAL NOT NULL DEFAULT 0.0,
    "prioridade_revisao" INTEGER NOT NULL DEFAULT 5,

    PRIMARY KEY ("id_usuario", "id_node"),
    CONSTRAINT "desempenho_no_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "desempenho_no_id_node_fkey" FOREIGN KEY ("id_node") REFERENCES "NodeConhecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "config_ai" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "id_usuario" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    CONSTRAINT "config_ai_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "aprendizado_flashcard_id_flashcard_id_usuario_key" ON "aprendizado_flashcard"("id_flashcard", "id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "NodeConhecimento_id_usuario_id_grafo_tipoNode_referencia_id_key" ON "NodeConhecimento"("id_usuario", "id_grafo", "tipoNode", "referencia_id");

-- CreateIndex
CREATE UNIQUE INDEX "ConhecimentoAresta_id_node_origem_id_node_destino_tipoRelacao_key" ON "ConhecimentoAresta"("id_node_origem", "id_node_destino", "tipoRelacao");

-- CreateIndex
CREATE UNIQUE INDEX "ConhecimentoAresta_id_nota_origem_id_nota_destino_tipoRelacao_key" ON "ConhecimentoAresta"("id_nota_origem", "id_nota_destino", "tipoRelacao");

-- CreateIndex
CREATE UNIQUE INDEX "desempenho_no_id_usuario_id_node_key" ON "desempenho_no"("id_usuario", "id_node");

-- CreateIndex
CREATE UNIQUE INDEX "config_ai_id_usuario_key" ON "config_ai"("id_usuario");
