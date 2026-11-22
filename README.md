# NeuraLabs

Flashcards inteligentes com grafo de conhecimento e notas Zettelkasten. Crie cartões a partir das suas notas, estude com repetição espaçada (SM-2), e visualize como os conceitos se conectam num grafo interativo. O backend roda localmente via Docker; a IA é configurável e aponta para qualquer API compatível com OpenAI.

## O que faz

- **Flashcards** com 14 tipos de cartão (pergunta/resposta, cloze, bidirecional, comparação, lista fragmentada, erro comum, e mais)
- **Repetição espaçada SM-2** — agenda a próxima revisão de cada cartão com base em acerto e nível de confiança (1–5)
- **Geração de flashcards por IA** a partir de notas — detecta definições automaticamente e usa LLM para tipos mais elaborados
- **Fase de elaboração** durante o estudo — o usuário escreve a resposta com as próprias palavras antes de ver o gabarito
- **Leitura em voz alta (TTS)** — ouça flashcards, notas, questões e textos gerados por IA (insights, resumos, chat do grafo); escolha entre a voz do sistema (Web Speech) ou voz neural natural via container Piper local (pt-BR e en-US), com velocidade e voz configuráveis e opção de leitura automática ao estudar
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

No Electron, **Configurações → Desktop → ChatGPT via Codex CLI** também permite
usar o Codex instalado na máquina com a sessão aberta por `codex login`. O backend
Docker acessa o proxy autenticado em `host.docker.internal:11436`. Ao desativar o
Codex, o app restaura o provedor anterior. Se o Claude Code estiver ativo,
desative-o antes de selecionar o Codex.

## Como funciona

### Leitura de PDFs escaneados

No Electron, abra **Biblioteca** e selecione um PDF do vault. Para reconhecer
páginas escaneadas, prepare o serviço local com `docker compose up -d --build reader-ocr`.
O build baixa os pesos do PaddleOCR do Hugging Face. Depois de pronta, a imagem
processa páginas sem internet. Escolha Português ou Inglês no leitor e clique
em **Reconhecer texto**. O vault guarda o resultado por página em
`.neuralabs/reader-ocr/`. O leitor e a busca no texto já disponível continuam
funcionando quando o serviço estiver desligado.
Use **Reconhecer livro para busca** para preencher o cache de OCR de todas as
páginas necessárias. Ao parar, as páginas concluídas podem ser reaproveitadas.

### Conversão de PDF para Markdown com figuras

Para experimentar o conversor de estrutura, execute `docker compose up -d --build document-converter`.
Na Biblioteca, abra um PDF e use **Converter livro para Markdown** dentro de
**Transcrições**. O app converte em lotes e guarda um único Markdown separado por
páginas, com as figuras em uma subpasta de `Resources/Bibliografia/Transcricoes/`. A transcrição
pode ser aberta ou movida para a lixeira pelo livro. O PDF original continua
disponível.

O serviço roda localmente na CPU. O preparo da imagem baixa os pesos do
[Heron](https://huggingface.co/docling-project/docling-layout-heron) e do
[TableFormer](https://huggingface.co/docling-project/docling-models). Ele usa
[Docling (MIT)](https://github.com/docling-project/docling/blob/main/LICENSE) e
[Tesseract (Apache-2.0)](https://github.com/tesseract-ocr/tesseract/blob/main/LICENSE)
com os dados de português e inglês para páginas escaneadas.

Na transcrição aberta, **Buscar por significado** compara a consulta com os
trechos do livro e direciona cada resultado à seção correspondente. A busca
funciona com português e inglês, inclusive em consultas sobre um livro no outro
idioma. O modelo [MiniLM multilíngue (Apache-2.0)](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)
é baixado na construção da imagem e executado na CPU. O conteúdo do livro e a
consulta ficam na máquina. A primeira busca indexa a transcrição em memória.

### Mapa de argumentos de um livro

Na transcrição página por página, abra **Gerar grafo para análise**, selecione
uma página, uma combinação como `2, 5–8` ou **Livro inteiro** e clique em
**Analisar com IA**. Os resultados são salvos no grafo do livro, onde é
possível filtrar pelas páginas analisadas. Transcrições antigas em blocos de 30 páginas precisam ser
geradas novamente para escolher páginas individuais.

Use **Leitura lado a lado** para acompanhar o PDF, a transcrição e o grafo
da mesma página. Os controles de página atualizam os três painéis juntos.

O botão **Perguntar à IA** usa a página aberta para explicar, simplificar,
dar uma analogia ou resumir pelo provedor configurado. Use **Salvar resposta
no vault** para guardar o texto aprovado em `Resources/Bibliografia/Anotacoes/`
com um link para a página na transcrição, quando ela estiver disponível.
No contexto **Livro inteiro**, o assistente busca passagens relacionadas na
transcrição e envia até seis delas ao provedor configurado para compor uma
síntese com fontes. As sínteses aprovadas ficam acessíveis em qualquer
página do livro. **Cobertura do grafo** mostra as páginas com análise salva.
Os trechos escolhidos são enviados pelo backend ao provedor configurado nas
opções de IA, inclusive aos proxies do Codex e do Claude.
O app analisa a transcrição em trechos, usa os títulos disponíveis como
referência de capítulo e indica o progresso. Cada sugestão precisa trazer
uma citação presente no texto. Revise os conceitos, as notas, os flashcards e as relações antes
de salvar o novo grafo. **Usar análise simples** mantém a extração por
títulos e frases explícitas disponível offline.

#### Melhoria futura do leitor semântico

A prioridade é permitir que o leitor aprove e salve no grafo do livro as
relações entre passagens de capítulos diferentes. Cada relação deve registrar
o papel da passagem, como definição, aplicação ou limite, e incluir uma
citação que abra na página correspondente da transcrição.

Depois, sugerir a reunião de conceitos equivalentes e indicar quando um
mesmo termo tem sentidos diferentes. A decisão fica com o leitor, que
pode comparar as fontes. Exemplos e analogias criados pela IA devem ter
autoria explícita. A cobertura semântica deve mostrar quais teses têm
evidências, exemplos e objeções vinculados.

Para validar a primeira entrega, escolha uma ideia que reaparece em três
capítulos. Registre a definição, a aplicação e o limite. Depois, verifique
se é possível reconstruir o percurso da ideia navegando pelo grafo e
abrindo as três citações.

### Repetição espaçada (SM-2)

Após cada cartão, o usuário informa se acertou e seu nível de confiança (1 a 5). Esses valores são mapeados para a qualidade SM-2 e o algoritmo recalcula o intervalo e o fator de facilidade. Cartões errados voltam para o dia seguinte; cartões corretos com alta confiança avançam progressivamente (1 → 6 → N × ease dias).

### Leitura em voz alta (TTS)

Dois motores, escolhidos nos ajustes:

- **Voz do sistema** (Web Speech API) — instantânea e offline no navegador/Electron; idioma chutado por trecho (pt/en/ja).
- **Voz natural (Piper)** — TTS neural local em container (`piper/`), no mesmo espírito do container de embeddings: grátis, offline, sem chave. Vozes pt-BR (faber, cadu, jeff, edresson) e en-US (amy, ryan) embutidas na imagem. O **backend faz o proxy** (`POST /api/tts/synthesize`, protegido por JWT) — o browser nunca fala com o Piper direto (container acessível só na rede interna do compose / localhost em dev).

Onde: botão de som (🔊) em flashcards, notas, questões (enunciado + explicação) e nos modais de IA do grafo (insights, resumo de comunidade, chat). Na sessão de estudo há **leitura automática** opcional (ajustes): lê a pergunta ao abrir o card e a resposta ao revelar — sem auto-avançar, respeitando a fase de elaboração.

A leitura é **frase a frase, destacando a frase atual** (estilo leitor de livro) nos blocos de texto único — flashcards, notas, explicação da questão, resumo de comunidade e respostas do chat. O mesmo divisor de frases roda no motor e na tela, então o destaque acompanha exatamente o que está sendo falado, nos dois motores.

**Idioma dentro da frase:** no modo automático com a voz do sistema, termos técnicos conhecidos (heap, cache, stack, backend…) são falados em **inglês** e o resto em **português**, na mesma frase — ex.: "heap como funciona" soa `heap` (inglês) + `como funciona` (português). A lista de termos vive em `src/components/speech/lang-segments.ts` (extensível). O Piper usa uma voz por idioma, então não troca no meio da frase (fala tudo na voz escolhida).

Robustez: se o Piper estiver indisponível, a leitura cai para a voz do sistema; texto em japonês sempre usa a voz do sistema (o Piper não tem voz japonesa).

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

Ambos os lados seguem **arquitetura hexagonal / DDD** por bounded context, em
`src/modules/<contexto>/`. A migração está **completa nos dois lados**: no backend
todos os contextos; no frontend todos os features. Nenhuma página em `src/app`
importa a borda HTTP (`@/lib/*-api`) diretamente — tudo passa por *ports* de módulo.

> Mapa de orientação rápida (camadas, regra de dependência, exceções cross-context
> e padrões recorrentes): **[`ARCHITECTURE.md`](ARCHITECTURE.md)**.

```
flashcard-app/
  src/                         ← Frontend React 19 + Vite + TypeScript
    app/                       ← Páginas finas (só re-export do módulo correspondente)
    components/                ← UI compartilhada (shadcn/ui, flashcard, sidebar, shell)
    lib/                       ← Borda HTTP (*-api.ts), vault bridge, utilitários
    modules/                   ← Código hexagonal (domain/application/infra/presentation)
      auth/ settings/ questions/ provas/ study/ notes/ flashcards/  ← features
      content/               ←   Shared kernel: hierarquia de conceitos + staging (notes+flashcards)
      dashboard/             ←   Home: KPIs, matérias, atividade recente
      graph/                 ←   Grafo: render, hooks, controller, serviços, layout
      vr/                    ←   Visualização XR (Three.js / react-three-fiber)
  test/                        ← Setup jsdom + visual regression (Playwright)
  electron/
    main.js                    ← Processo principal: janela, IPC, vault, config
    preload.js                 ← Bridge segura entre renderer e main
  backend/                     ← API NestJS — 100% hexagonal/DDD
    src/
      modules/<contexto>/      ← Cada bounded context em 4 camadas:
        domain/                ←   tipos, regras, value objects, ports, erros (puro)
        application/           ←   use-cases (orquestram domínio + ports)
        infrastructure/        ←   adapters (Prisma, OpenAI) que implementam os ports
        interface/             ←   filtros de erro de domínio → HTTP
                               ←   contextos: ai, auth, curriculum, flashcards, graph,
                               ←   notes, provas, questions, settings, study
      <contexto>/              ← Glue NestJS fino: controllers + módulos compondo use-cases
    prisma/
      schema.prisma            ← Modelo de dados (PostgreSQL)
  docker-compose.yml           ← Postgres + backend + frontend nginx
```

## Qualidade e testes

```bash
# Frontend — testes (2 ambientes: *.spec.ts em node, *.test.tsx em jsdom)
npm run test
npm run test -- --coverage          # com cobertura

# Frontend — regressão visual (browser real via Playwright; screenshots)
npm run test:visual

# Frontend — gates de arquitetura (escopo src/modules/**)
npm run lint:strict                 # clean code: tamanho, complexidade, tipos, naming
npm run arch:check                  # fronteiras hexagonais (dependency-cruiser)

# Frontend — mutação (Stryker, só lógica pura)
npm run test:mutation

# Backend — unitários (sem banco) / integração / e2e / mutação
cd backend && npm run test
cd backend && npm run test:integration   # requer o Postgres de teste neuralabs_test
cd backend && npm run test:e2e           # sobe a app Nest via supertest
cd backend && npm run test:mutation
cd backend && npm run lint:strict && npm run arch:check
```

**Convenção de testes do frontend:** `*.spec.ts` → lógica pura (ambiente `node`);
`*.test.tsx` → componentes/hooks (`jsdom` + `@testing-library/react`); `*.visual.test.tsx`
→ regressão visual (Playwright/Chromium, fora do `npm test`).

**Gates estritos** (`lint:strict` + `arch:check`) valem em `src/modules/**` (código
hexagonal). O que fica em `src/{app,components,lib}` é infra compartilhada (páginas
finas, primitivas de UI, clientes HTTP) — report-only por design, não feature a migrar.
As regras e suas diferenças backend × frontend estão no [`AGENTS.md`](AGENTS.md).

**Mutação** (verifica a _eficácia_ dos testes, não só a cobertura) mira a lógica pura.
Frontend: `vault-format`, `graph-communities`, `graph-metrics`, `srs-local`,
`relation-rules`, `roadmap.service`, `graph.selectors`, `graph-style.service`,
`graph-physics.service`, `force-layout.engine`, `card-styles`. Backend: domínio de estudo
(Value Objects, agregados `Flashcard`/`StudySession`, `spaced-repetition`, `interleaving`)
+ use-cases. Relatório HTML em `reports/mutation/index.html`.
