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

Os nós podem ser de 7 tipos: `ASSUNTO`, `TOPICO`, `CONCEITO`, `NOTA`, `FLASHCARD`, `TEXTO_BRUTO`, `BARALHO`. As relações entre eles seguem regras tipadas (ex: um `TOPICO` pertence a um `ASSUNTO`; um `CONCEITO` pode ter relação `APROFUNDA`, `CONTRASTA`, `DEPENDE_DE`, etc.). O layout usa força física via `@xyflow/react`.

### Análise de grafo (inspirado no InfraNodus)

Quatro ferramentas de análise de rede acessíveis pela toolbar do grafo:

**Comunidades** (ícone de rede): executa Label Propagation no grafo atual e agrupa nós em clusters. Cada cluster recebe uma cor e exibe quantos flashcards contém. Botão "Criar baralho" gera um `BARALHO` com os flashcards do cluster.

**Lacunas estruturais** (ícone de raio): detecta pares de clusters sem nenhuma aresta entre si. Para cada lacuna, exibe os nós mais próximos de cada lado ("pontes potenciais") e oferece o botão "Preencher com IA", que chama o LLM configurado pedindo 4–6 sugestões de novos nós que conectariam os clusters. As sugestões podem ser selecionadas individualmente antes de adicionar ao grafo.

**Betweenness centrality**: calculada com o algoritmo de Brandes (O(VE)) e exibida no painel de Analytics → seção "Nós-ponte". Nós com score alto são aqueles cuja remoção mais desconectaria o grafo.

**Estudar vizinhança**: disponível no painel de propriedades de qualquer nó (tipos ASSUNTO / TOPICO / CONCEITO / NOTA). Faz um BFS a partir do nó selecionado até a profundidade configurada no focusDepth e coleta os IDs de todos os FLASHCARDs alcançados. Abre uma sessão de estudo SRS com esses cards, sem precisar criar um baralho manualmente.

---

### Automações de IA no grafo

Todas as features abaixo requerem a IA configurada em **Configurações**. O modelo recebe o conteúdo do grafo como contexto e retorna resultados estruturados. Cada chamada é feita pelo backend — a chave de API nunca chega ao frontend.

#### Toolbar do grafo

**Gerar grafo por texto** (ícone de varinha)

Cria um grafo completo a partir de qualquer texto ou material de estudo.

1. Clique no ícone de varinha na toolbar
2. Cole ou escreva o texto no campo (pode ser um capítulo, artigo, resumo, etc.)
3. A IA extrai automaticamente um `ASSUNTO`, vários `TÓPICO`s, `CONCEITO`s dentro de cada tópico, `NOTA`s para os conceitos e `FLASHCARD`s com perguntas e respostas
4. O grafo é atualizado com todos os nós e relações gerados
5. Um baralho com os flashcards é criado automaticamente

Use quando quiser popular o grafo a partir de material existente sem precisar criar nós manualmente.

---

**Auto-link — conectar nós relacionados** (ícone de corrente)

Sugere arestas que deveriam existir entre nós já presentes no grafo mas que ainda não estão conectados.

1. Clique no ícone de corrente
2. A IA analisa todos os nós e retorna até 15 sugestões de conexão com o tipo de relação e o motivo de cada uma
3. Todas ficam marcadas por padrão — desmarque as que não quiser
4. Clique em "Adicionar selecionadas" para criar as arestas no grafo

Útil depois de importar texto ou de criar muitos nós manualmente, para fechar as relações que ficaram faltando.

---

**Detecção de duplicatas** (ícone de cópia)

Identifica nós semanticamente equivalentes que poderiam ser o mesmo conceito com nomes ligeiramente diferentes.

1. Clique no ícone de cópia
2. A IA agrupa nós com significado equivalente e mostra cada grupo com uma sugestão de por que são duplicatas
3. Para cada grupo, clique no nó que deseja **manter** (ele ficará destacado com "manter")
4. Clique em **"Mesclar grupo"** — todas as arestas dos nós removidos são movidas para o nó mantido antes da exclusão
5. Alternativamente, use o botão de lixeira em cada nó individual para deletar apenas aquele nó sem mesclar

---

**Pré-requisitos faltantes** (ícone de ramificação)

Detecta conceitos ou tópicos que deveriam existir no grafo como base para o que já está lá, mas ainda não foram adicionados.

1. Clique no ícone de ramificação
2. A IA analisa os `TÓPICO`s e `CONCEITO`s presentes e sugere de 3 a 8 novos nós que são pré-condição para entender o conteúdo atual
3. Cada sugestão mostra nome, tipo, motivo e para quais nós existentes deveria se conectar
4. Clique em **"Adicionar"** em cada item individualmente — o nó é criado e as arestas com os nós destino são adicionadas automaticamente com a relação correta (PREREQUISITO, PERTENCE_A ou DEPENDE_DE dependendo dos tipos envolvidos)
5. O botão vira "Adicionado ✓" após o sucesso

---

**Trilha de aprendizado** (ícone de rota)

Gera uma sequência ordenada de estudo do mais básico ao mais avançado, considerando as relações de dependência já existentes no grafo.

1. Clique no ícone de rota
2. A IA lê todos os `ASSUNTO`s, `TÓPICO`s e `CONCEITO`s e analisa as relações existentes (especialmente `PREREQUISITO`, `DEPENDE_DE` e `SUBTOPICO_DE`) para ordenar os nós
3. O resultado é uma lista numerada: cada item mostra o tipo do nó (badge colorido), o nome e uma justificativa curta de por que esse conteúdo vem neste ponto da sequência
4. Clique em **"Regerar"** para obter uma nova ordenação

Use para saber por onde começar quando o grafo tem muitos nós sem uma ordem evidente.

---

**Chat com o grafo** (ícone de mensagem)

Interface de chat onde você faz perguntas e a IA responde usando o conteúdo do seu grafo como única fonte de contexto.

1. Clique no ícone de mensagem
2. Digite uma pergunta no campo inferior e pressione Enter ou clique em enviar
3. A IA busca tópicos, conceitos e notas relevantes no grafo e responde em Markdown, citando apenas o que está presente no seu conhecimento
4. Abaixo de cada resposta aparecem chips com os nós referenciados (ex: "🔗 Conceito: Derivada Parcial")
5. O histórico da conversa é mantido durante a sessão; ao fechar o modal o histórico é limpo
6. A IA não tem acesso à internet — se um conceito não está no grafo, ela diz que não encontrou

Útil para testar se você realmente documentou um assunto no grafo ("O que eu sei sobre X?") e para recuperar informações sem precisar navegar manualmente.

---

**Completude do conhecimento** (ícone de gráfico de barras)

Avalia o quanto cada assunto do grafo está coberto, identificando o que está bem documentado, o que está raso e o que está completamente faltando.

1. Clique no ícone de gráfico de barras
2. A IA analisa todos os assuntos e os tópicos/conceitos associados a cada um
3. Para cada assunto é exibido:
   - **Score de 0 a 10** com barra de progresso (verde ≥ 7, amarelo ≥ 4, vermelho < 4)
   - **Bem coberto**: tópicos e conceitos com boa profundidade
   - **Raso**: áreas presentes mas com pouco detalhe
   - **Faltando**: conceitos importantes do domínio que ainda não estão no grafo
4. Clique em **"Regerar"** para uma nova avaliação

Use periodicamente para identificar onde concentrar esforços de estudo e expansão do grafo.

---

**Lacunas estruturais** (ícone de raio)

Detecta pares de clusters que não têm nenhuma aresta entre si e sugere nós que poderiam conectá-los.

1. O ícone fica laranja quando existem lacunas; o número ao lado indica quantas foram encontradas
2. Clique para abrir o painel de lacunas — cada lacuna exibe os dois clusters envolvidos e destaca no grafo os nós mais próximos de cada lado com uma linha tracejada
3. Passe o mouse sobre uma lacuna para destacar os clusters visualmente
4. Clique em **"Preencher com IA"** em qualquer lacuna para que o LLM sugira 4–6 novos nós (CONCEITO ou NOTA) que fariam a ponte
5. Selecione individualmente as sugestões desejadas e clique em "Adicionar ao grafo"

---

#### Painel de propriedades (selecionar um nó)

**Insights da IA**

Disponível para qualquer nó. Gera sugestões de expansão e aprofundamento baseadas no conteúdo do nó e nos seus vizinhos diretos.

1. Selecione um nó no grafo
2. No painel lateral direito, clique em **"Insights da IA"**
3. A IA recebe o conteúdo do nó, o conteúdo completo dos seus vizinhos diretos (1 salto) e os nomes dos demais nós do grafo como contexto
4. Retorna de 4 a 8 insights organizados por categoria (Relacionado, Aprofundamento, Aplicação, Contraste, etc.), cada um com um título, descrição e o tipo de nó/relação sugeridos
5. Clique em **"Adicionar ao grafo"** para transformar os insights selecionados em nós reais conectados ao nó original

---

**Expandir com IA**

Disponível para nós do tipo `ASSUNTO`, `TOPICO`, `CONCEITO` e `NOTA`. Gera automaticamente sub-nós a partir do conteúdo do nó selecionado.

1. Selecione um nó
2. No painel lateral, clique em **"Expandir com IA"**
3. O que é gerado depende do tipo do nó:
   - `ASSUNTO` → tópicos + conceitos
   - `TÓPICO` → conceitos
   - `CONCEITO` → nota explicativa + flashcards
   - `NOTA` → flashcards
4. Todos os nós gerados são automaticamente conectados ao nó original com as relações apropriadas
5. Um toast confirma quantos nós de cada tipo foram criados

---

#### Notas

**Sugestão de relações**

Ao criar ou editar uma nota, após salvar o conteúdo, o sistema sugere automaticamente conexões com nós já existentes no grafo. As sugestões aparecem como chips que podem ser aceitos ou descartados individualmente.

---

**Gerar flashcards por IA**

Dentro de qualquer nota, o botão **"Gerar flashcards"** envia o conteúdo para o LLM e retorna cartões de estudo com diferentes tipos (definição, cloze, comparação, aplicação, etc.). Os cartões são exibidos em preview antes de serem salvos, e é possível selecionar quais manter.

---

**Analisar texto bruto**

Disponível na toolbar do grafo (ícone de varinha) e também acessível via importação de material. Recebe um texto longo (capítulo, artigo, etc.) e extrai notas candidatas com título, conteúdo e os conceitos previstos. Cada nota candidata pode ser aceita ou descartada antes de salvar.

---

#### Painel de comunidades

**Resumir comunidade**

No painel de comunidades (ícone de rede na toolbar), cada cluster tem um botão **"Resumir"**.

1. Clique em "Resumir" em qualquer cluster
2. A IA lê o conteúdo de todos os nós do cluster (assuntos, tópicos, conceitos e notas) e gera um resumo de estudo em Markdown de 200 a 500 palavras, conectando os conceitos de forma narrativa em vez de apenas listá-los
3. O resumo é exibido formatado no modal, com título gerado pela IA
4. Clique em **"Copiar"** para levar o resumo para outro lugar (Obsidian, Anki, etc.)

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
      study/                   ← Sessões de estudo, SM-2, interleaving
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

# Backend
cd backend && npm run test
```

Os testes de mutação cobrem os módulos de lógica pura: `vault-format`, `graph-communities`, `graph-metrics`, `srs-local`, `relation-rules`, `roadmap.service`, `graph.selectors`, `graph-style.service`, `graph-physics.service`, `force-layout.engine` e `card-styles`. O relatório HTML é gerado em `reports/mutation/index.html`.
