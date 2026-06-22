# NeuraLabs

Flashcards inteligentes com grafo de conhecimento e notas Zettelkasten. Crie cartões a partir das suas notas, estude com repetição espaçada (SM-2), e visualize como os conceitos se conectam num grafo interativo. O backend roda localmente via Docker; a IA é configurável e aponta para qualquer API compatível com OpenAI.

## O que faz

- **Flashcards** com 14 tipos de cartão (pergunta/resposta, cloze, bidirecional, comparação, lista fragmentada, erro comum, e mais)
- **Repetição espaçada SM-2** — agenda a próxima revisão de cada cartão com base em acerto e nível de confiança (1–5)
- **Geração de flashcards por IA** a partir de notas — detecta definições automaticamente e usa LLM para tipos mais elaborados
- **Fase de elaboração** durante o estudo — o usuário escreve a resposta com as próprias palavras antes de ver o gabarito
- **Grafo de conhecimento interativo** — visualiza assuntos, tópicos, conceitos, notas e flashcards como nós conectados por relações tipadas
- **Insights de nó por IA** — analisa o nó selecionado junto com seus vizinhos diretos e sugere 4–8 novos nós/conexões organizados por categoria
- **Expansão de nó por IA** — gera sub-nós automaticamente a partir de qualquer nó (ASSUNTO → tópicos+conceitos, CONCEITO → nota+flashcards, etc.)
- **Gerar grafo por texto** — cola qualquer material de estudo e a IA cria assunto, tópicos, conceitos, notas e flashcards de uma vez
- **Auto-link** — IA sugere arestas faltantes entre nós existentes; usuário seleciona quais adicionar
- **Detecção e merge de duplicatas** — agrupa nós semanticamente equivalentes; merge move todas as arestas para o nó mantido antes de deletar os demais
- **Pré-requisitos faltantes** — IA detecta conceitos que deveriam existir como base para o conteúdo atual e os adiciona com as relações corretas
- **Trilha de aprendizado** — sequência ordenada do básico ao avançado considerando as dependências existentes no grafo
- **Chat com o grafo** — interface de chat onde a IA responde usando exclusivamente o conteúdo do seu grafo como contexto
- **Completude do conhecimento** — score 0–10 por assunto com listas de áreas bem cobertas, rasas e completamente faltando
- **Análise de comunidades** — detecta clusters via Label Propagation; permite criar baralhos e resumos de estudo por cluster
- **Detecção de lacunas estruturais** — identifica clusters sem conexão entre si; IA sugere nós ponte
- **Resumo de comunidade por IA** — gera texto narrativo em Markdown a partir do conteúdo de um cluster
- **Centralidade de betweenness** — calcula nós estratégicos com algoritmo de Brandes; exibido no dashboard de analytics
- **Estudo por vizinhança (ego network)** — coleta flashcards a até N saltos de distância de qualquer nó e abre sessão de estudo focada
- **Notas Zettelkasten** com suporte a Markdown e geração de cartões inline
- **Dashboard** com cartões para revisar hoje, taxa de acerto e histórico de sessões
- **Vault sync** — exporta e importa notas em `.md` para uso com Obsidian ou qualquer editor externo; cada grafo tem sua própria subpasta (`<slug>--<id>/`) com estrutura PARA isolada; Pull detecta conflitos com edições locais antes de sobrescrever; layout do grafo usa posições salvas — novos nós do vault assentam entre os existentes sem embaralhar o mapa; timestamps do último Pull/Push visíveis no modal
- **Visualização VR/AR no Meta Quest 3** — botão "Visualizar em XR" na toolbar do grafo abre a rota `/vr/:id`; o grafo é renderizado em 3D (Three.js + WebXR) com controles por joystick; clicar em um nó abre um painel de propriedades 3D (billboard) com label, tipo, domínio, prioridade, pergunta, relações clicáveis, stats de baralho e metadata de nota
- **Aplicativo desktop** via Electron — roda sem navegador, aponta para um backend configurável
- **Auth JWT** com registro e login; cada usuário tem seu próprio espaço isolado

## Screenshot

> *(adicione um screenshot aqui)*

## Instalando a partir dos binários

Baixe a última release na [página de Releases](../../releases): `.exe` para Windows, `.AppImage` para Linux, `.dmg` para macOS.

Você também precisa do **Docker** instalado e rodando, e subir o backend com:

```bash
docker-compose up -d
```

## Requisitos (para rodar a partir do código)

- Node.js 20+
- Docker e Docker Compose (para o banco PostgreSQL e o backend NestJS)
- Uma chave de API compatível com OpenAI (ex: [OpenRouter](https://openrouter.ai)) para a geração de flashcards e insights

## Rodando em modo dev

```bash
# 1. Sobe o Postgres + backend NestJS
docker-compose up -d postgres backend

# 2. Instala dependências do frontend
npm install

# 3. Inicia o Vite (dev server na porta 5173)
npm run dev

# 4. Em outro terminal, abre o Electron apontando para o Vite
npm run electron:dev
```

Para rodar só no navegador (sem Electron), acesse `http://localhost:5173` após o passo 3.

## Build de distribuição

```bash
# Gera o bundle do Vite + instalador Electron
npm run desktop:dist
```

O binário será gerado em `dist/`.

## Configuração da IA

Na tela de **Configurações** dentro do app, informe:

| Campo | Descrição |
|---|---|
| API Key | Chave da sua API (OpenRouter, OpenAI, etc.) |
| Base URL | Endpoint da API (padrão: `https://openrouter.ai/api/v1`) |
| Modelo | ID do modelo (ex: `qwen/qwen3-6b:free`, `gpt-4o-mini`) |

As chamadas de IA são feitas pelo backend — a chave nunca chega ao frontend.

## Como funciona

### Repetição espaçada (SM-2)

Após cada cartão, o usuário informa se acertou e seu nível de confiança (1 a 5). Esses valores são mapeados para a qualidade SM-2 e o algoritmo recalcula o intervalo e o fator de facilidade. Cartões errados voltam para o dia seguinte; cartões corretos com alta confiança avançam progressivamente (1 → 6 → N × ease dias).

### Geração de flashcards

Ao gerar cartões a partir de uma nota, o backend aplica duas estratégias em sequência:

1. **Detecção por padrão** — identifica definições no formato `Termo: descrição` e cria cartões sem custo de API
2. **Geração por LLM** — envia o texto para o modelo configurado e retorna cartões em JSON estruturado, cobrindo tipos como cloze, comparação, erro comum, aplicação de problema, e outros

### Grafo de conhecimento

Veja a documentação completa em [docs/graph.md](docs/graph.md).

### Visualização VR/AR (Meta Quest 3)

A rota `/vr/:id` carrega o grafo numa cena Three.js com suporte a WebXR. Use o botão com ícone de globo na toolbar do grafo 2D para entrar. No Quest 3:

- **Controles**: stick esquerdo orbita em torno do usuário; stick direito rotaciona o grafo
- **Selecionar nó**: mire o laser do controle e pressione o gatilho
- **Painel de propriedades 3D**: abre ao selecionar um nó, sempre de frente para o usuário (billboard). Exibe tipo, label, ID, barra de domínio, prioridade, pergunta, stats do baralho, metadata de nota e lista de relações clicáveis
- **Navegar pelas relações**: clicar no label de um nó relacionado seleciona aquele nó sem sair do modo VR
- **Requisito**: acesse via HTTPS (`npm run dev` usa `@vitejs/plugin-basic-ssl`); o backend é proxied via `/api`

### Vault sync

O app desktop expõe um IPC para ler e gravar arquivos `.md` na pasta de vault escolhida pelo usuário. A estrutura segue o sistema PARA (Projects / Areas / Resources / Archives), compatível com Obsidian.

## Estrutura do projeto

```
flashcard-app/
  src/                         ← Frontend React 19 + Vite + TypeScript
    app/                       ← Páginas (dashboard, flashcards, notas, estudo, grafo, settings)
    components/                ← UI (shadcn/ui, flashcard, grafo, sidebar)
    lib/                       ← Clientes HTTP, vault bridge, utilitários
    modules/graph/             ← Módulo do grafo (domínio, infra, apresentação)
  electron/
    main.js                    ← Processo principal: janela, IPC, vault, config
    preload.js                 ← Bridge segura entre renderer e main
  backend/                     ← API NestJS
    src/
      auth/                    ← JWT (registro, login, guard)
      content/                 ← Flashcards, decks, geração por IA
      study/                   ← Controller/serviço de sessões (sessão, deck, vault sync)
      modules/study/           ← Domínio de estudo em camadas hexagonais (DDD):
        domain/                ←   VOs (Grade/Phase/EaseFactor), agregados (Flashcard/
                               ←   StudySession), SM-2, interleaving, ports, erros
        application/           ←   use-cases: submit-review, start-session
        infrastructure/        ←   adapters Prisma (repos por agregado + UoW) + mappers
        interface/             ←   filtro de erros de domínio → HTTP
      graph/                   ← Nós, arestas, regras de relação, insights IA
      notes/                   ← Notas Zettelkasten
      ai/                      ← AiService (OpenAI-compatible client)
      settings/                ← Config de IA por usuário
    prisma/
      schema.prisma            ← Modelo de dados (PostgreSQL)
  docker-compose.yml           ← Postgres + backend + frontend nginx
```

## Testes

```bash
# Frontend — unitários e integração
npm run test

# Frontend — com cobertura
npm run test -- --coverage

# Testes de mutação (Stryker) — verifica a qualidade dos testes
npm run test:mutation

# Backend — unitários (sem banco)
cd backend && npm run test

# Backend — integração (requer o Postgres de teste neuralabs_test)
cd backend && npm run test:integration

# Backend — e2e (sobe a app Nest via supertest; requer o Postgres de teste)
cd backend && npm run test:e2e

# Backend — mutação (Stryker)
cd backend && npm run test:mutation
```

Os testes de mutação do frontend cobrem os módulos de lógica pura: `vault-format`, `graph-communities`, `graph-metrics`, `srs-local`, `relation-rules`, `roadmap.service`, `graph.selectors`, `graph-style.service`, `graph-physics.service`, `force-layout.engine` e `card-styles`. No backend, a mutação cobre o domínio de estudo (Value Objects, agregados `Flashcard`/`StudySession`, `spaced-repetition`, `interleaving`) e os use-cases `submit-review` e `start-session`. O relatório HTML é gerado em `reports/mutation/index.html`.
