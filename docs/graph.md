# Grafo de Conhecimento — Documentação completa

O grafo de conhecimento é o núcleo do NeuraLabs. Ele representa seu conhecimento como uma rede semântica de nós interconectados — cada conceito, nota, flashcard e material de estudo ocupa um nó; as relações entre eles são explícitas, tipadas e navegáveis.

---

## Índice

1. [Tipos de nó](#1-tipos-de-nó)
2. [Tipos de relação](#2-tipos-de-relação)
3. [Layout da interface](#3-layout-da-interface)
4. [Cabeçalho (header)](#4-cabeçalho-header)
5. [Barra lateral esquerda](#5-barra-lateral-esquerda)
6. [Barra de ferramentas flutuante](#6-barra-de-ferramentas-flutuante)
7. [Configurações de física e visualização](#7-configurações-de-física-e-visualização)
8. [Painel de propriedades do nó](#8-painel-de-propriedades-do-nó)
9. [Menus de contexto e multi-seleção](#9-menus-de-contexto-e-multi-seleção)
10. [Subgrafos](#10-subgrafos)
11. [Análise estrutural](#11-análise-estrutural)
12. [Roadmap de estudo](#12-roadmap-de-estudo)
13. [Automações de IA](#13-automações-de-ia)
14. [Notas — tipos de conteúdo (SubtipoNota)](#14-notas--tipos-de-conteúdo-subtiponota)
15. [Vault sync](#15-vault-sync)
16. [Importação e exportação JSON](#16-importação-e-exportação-json)
17. [Excluir um grafo](#17-excluir-um-grafo)

---

## 1. Tipos de nó

O grafo suporta 8 tipos de nó, cada um com forma visual e cor distintas:

| Tipo | Forma | Cor | Descrição |
|---|---|---|---|
| `ASSUNTO` | Círculo | Índigo | Domínio ou área de conhecimento raiz |
| `TOPICO` | Elipse | Azul-céu | Subdivisão de um assunto |
| `CONCEITO` | Rect | Verde-esmeralda | Unidade atômica de conhecimento |
| `NOTA` | Rect vertical | Fúcsia | Nota Zettelkasten vinculada a conceitos |
| `FLASHCARD` | Quadrado | Amarelo | Cartão de estudo com SRS |
| `TEXTO_BRUTO` | Rect | Cinza-ardósia | Material de origem (artigo, capítulo, transcrição) |
| `BARALHO` | Rect | Laranja | Coleção de flashcards para sessão de estudo |
| `GRAFO_REF` | Rect | Violeta | Referência semântica a outro grafo (subgrafo) |

**Hierarquia típica:**

```
ASSUNTO
  └── TOPICO
        └── CONCEITO ─── NOTA
                    └─── FLASHCARD
                    └─── BARALHO  (agrupa FLASHCARDs)
TEXTO_BRUTO ──GERA──► NOTA
GRAFO_REF ──────────► outro GRAFO
```

**Domínio:** cada nó tem um `nivelDominio` (0–1) calculado pela média de acerto nos flashcards associados via SRS. Exibido como barra de progresso no painel de propriedades.

---

## 2. Tipos de relação

35+ tipos de relação agrupados por contexto:

### Nota → Conceito
| Relação | Significado |
|---|---|
| `DEFINE` | A nota define o conceito |
| `EXPLICA` | A nota explica o funcionamento |
| `APROFUNDA` | A nota aprofunda o conceito |
| `EXEMPLIFICA` | A nota exemplifica o conceito |
| `CONTRASTA` | A nota contrasta dois conceitos |
| `SINTETIZA` | A nota sintetiza múltiplos conceitos |
| `ALERTA_ERRO` | A nota documenta um erro comum |

### Conceito ↔ Conceito
| Relação | Significado |
|---|---|
| `IS_A` | Especialização / herança semântica |
| `PART_OF` | Relação parte-todo |
| `PREREQUISITO` | Deve ser entendido antes |
| `DERIVA_DE` | Derivado de outro conceito |
| `EVOLUI_PARA` | Versão mais avançada |
| `REFORCA` | Consolida ou reforça |
| `ALTERNATIVA_A` | Abordagem alternativa |
| `CONTRASTA_COM` | Contraste conceitual direto |
| `CONFUNDE_COM` | Costuma ser confundido com |
| `ANTI_PADRAO_DE` | Antipadrão de outro conceito |
| `MEDIDO_POR` | Métricas ou indicadores |
| `OBJETIVO_DE` | É objetivo de outro conceito |

### Conceito / Tópico ↔ Tópico / Assunto
| Relação | Significado |
|---|---|
| `PERTENCE_A` | Pertence a um tópico ou assunto |
| `FUNDAMENTA` | É base para |
| `APLICADO_EM` | É aplicado em |
| `SUBTOPICO_DE` | Subtópico de outro tópico |
| `RELACIONADO` | Relação genérica |
| `DEPENDE_DE` | Dependência direta |

### Flashcard / Baralho
| Relação | Significado |
|---|---|
| `TESTA` | Flashcard testa um conceito ou nota |
| `HERDA` | Herda contexto de outro nó |
| `CONTEM` | Baralho contém flashcard |
| `TESTA_DEFINICAO` | Testa definição |
| `TESTA_EXEMPLO` | Testa exemplo |
| `TESTA_APLICACAO` | Testa aplicação |
| `TESTA_ANALISE` | Testa análise |
| `TESTA_SINTESE` | Testa síntese |

### Texto bruto
| Relação | Significado |
|---|---|
| `GERA` | Texto bruto gera notas/conceitos |
| `REFERENCIA` | Referência bibliográfica |

### Subgrafos (GRAFO_REF)
| Relação | Significado |
|---|---|
| `PREREQUISITO` | O subgrafo é pré-requisito deste grafo |
| `APROFUNDA` | O subgrafo aprofunda este grafo |
| `DERIVA_DE` | O subgrafo deriva deste grafo |
| `APLICADO_EM` | O subgrafo é aplicação deste |
| `CONTRASTA_COM` | O subgrafo contrasta com este |
| `SINTETIZA` | O subgrafo sintetiza este |
| `RELACIONADO` | Relação semântica genérica |

---

## 3. Layout da interface

```
┌─────────────────────────────────────────────────────────┐
│  CABEÇALHO: ← breadcrumb · nome · XR · analytics · IA  │
├─────────────────────────────────────────────────────────┤
│ │     │                                      │          │
│ │Barra│                                      │ Painel   │
│ │lat. │        CANVAS DO GRAFO               │ props    │
│ │esq. │                                      │ (nó sel.)│
│ │     │          [GraphToolbar flutuante]     │          │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Cabeçalho (header)

Localização: faixa horizontal no topo da tela.

| Elemento | Como acessar | Função |
|---|---|---|
| `←` (voltar) | Clique | Volta para a lista de grafos (`/graph`) |
| Breadcrumb | Automático quando há pai | Exibe `[← NomePai] > NomeAtual`; clicar no nome do pai navega para ele |
| Nome do grafo | Centro | Exibe o nome do grafo atual |
| Globo | Clique | Abre visualização VR/3D do grafo (`/vr/:id`) |
| Gráfico de barras | Clique | Abre painel de analytics |
| Rede | Clique | Abre painel de comunidades |
| Raio (⚡) | Clique | Abre painel de lacunas estruturais; fica laranja quando há lacunas, com contador |
| **IA ▾** | Clique | Dropdown com todas as automações de IA (ver seção 13) |
| Subgrafo | Clique | Abre modal "Novo subgrafo" |
| Vault | Clique (desktop) | Abre modal de sincronização com vault Markdown |

---

## 5. Barra lateral esquerda

Localização: painel vertical flutuante fixado no centro-esquerdo do canvas.

### Ferramentas de interação

| Botão | Atalho | Função |
|---|---|---|
| `+` (Novo nó) | — | Abre modal para criar um novo nó no grafo |
| Corrente (Gerenciar relações) | — | Abre o gerenciador de arestas |
| `{}` (Importar JSON) | — | Abre modal de importação de grafo em JSON |
| ↖ Selecionar | `V` | Ferramenta padrão: clique seleciona, Ctrl+clique adiciona à seleção |
| ⬜ Marquee | `M` | Arrastar no canvas desenha um retângulo de seleção múltipla |
| ✋ Mover | `H` | Arrastar no canvas move o viewport (pan) |

### Buscar e filtrar nós

**Como abrir:** clique no ícone de lupa na barra lateral. O painel abre à direita da barra.

O painel tem dois modos: busca textual e filtros avançados.

**Busca textual:**
1. Digite no campo "Buscar por texto..."
2. Escolha o escopo: **Tudo** (título + conteúdo), **Título** (só o rótulo do nó), **Conteúdo** (busca dentro do conteúdo da nota/texto)
3. Os nós que casam ficam destacados no canvas; os demais ficam esmaecidos
4. A lista de resultados abaixo permite clicar para navegar até cada nó

**Filtros avançados** (clique em "Filtros"):
- **Tipo de nó** — chips clicáveis para incluir/excluir cada tipo (ASSUNTO, TOPICO, CONCEITO, etc.)
- **Domínio** — slider de range (0%–100%) para filtrar por nível de domínio
- **Prioridade de revisão** — slider de range numérico
- **Conexões** — 4 opções: Qualquer, Isolados (0), Poucos (1–2), Muitos (3+)

O ícone de lupa fica com um anel quando há filtros ativos. "Limpar" reseta todos os filtros.

### Tipos de nó (camadas)

**Como abrir:** clique no ícone de camadas (🗂) na barra lateral.

Exibe um painel com toggle individual para cada tipo de nó presente no grafo. Desativar um tipo oculta todos os seus nós no canvas sem deletá-los. O ícone fica com um anel quando há tipos ocultos.

**Uso comum:** ocultar FLASHCARDs e BARALHOs para visualizar apenas a estrutura conceitual, ou ocultar TEXTO_BRUTO para focar nos conceitos processados.

### Roadmap de estudo

**Como abrir:** clique no ícone de rota (🗺) na barra lateral. O painel abre à direita da barra.

O Roadmap tem dois modos, alternáveis por abas:

**Modo "Por urgência":**
- Lista todos os tópicos e conceitos do grafo organizados por seção, ordenados por urgência de revisão (domínio baixo + prioridade alta primeiro)
- Cada item mostra o status: ✓ Dominado, ◐ Parcial, ○ Pendente
- Barra de progresso no topo: `N de M dominados`
- Clicar em qualquer item centraliza o canvas naquele nó e o seleciona
- Não requer IA

**Modo "Trilha IA":**
- Clique em **"Gerar trilha"** para que a IA produza uma sequência ordenada de estudo considerando as dependências do grafo
- A trilha é exibida como cards navegáveis com botões `←` `→` para avançar/recuar
- Cada passo mostra o tipo do nó, o nome e a justificativa da IA para aquele ponto da sequência
- Clicar em um passo centraliza o canvas naquele nó
- **Salvar trilha:** após gerar, clique em "Salvar" para persistir a trilha no localStorage; ela reaparece na próxima visita ao mesmo grafo
- **Remover:** exclui a trilha salva do localStorage
- Se o grafo foi modificado desde que a trilha foi salva, aparece um aviso de desatualização

---

## 6. Barra de ferramentas flutuante

Localização: painel vertical flutuante fixado no centro-direito do canvas (abaixo e acima do centro).

| Botão | Função |
|---|---|
| `+` Zoom in | Aproxima o canvas |
| `-` Zoom out | Afasta o canvas |
| ⚡ Física | Liga/desliga a simulação de força física. Quando ligada, os nós se movem até atingir equilíbrio; quando desligada, as posições ficam fixas |
| ◑ Alto contraste | Renderiza todos os nós e arestas na cor primária do tema (ignora cores por tipo). Útil para apresentações ou daltônicos |
| 🔍 Modo foco | Ao selecionar um nó, ofusca todos os nós e arestas que não sejam vizinhos diretos (até N saltos, configurável em Configurações). Realça o contexto imediato do nó selecionado |
| 📖 Legenda | Exibe/oculta a legenda de cores e formas dos tipos de nó no canto do canvas |
| 3D | Alterna entre renderização 2D (SVG) e 3D (Three.js + WebGL). Em 3D, o grafo pode ser orbitado com o mouse |
| ⚙ Configurações | Abre o modal de configurações de física e visualização |

---

## 7. Configurações de física e visualização

**Como abrir:** botão ⚙ na barra flutuante.

### Modos de física

- **Padrão (hierárquico)** — cada nó orbita seu "pai" na hierarquia, formando anéis concêntricos: o **Assunto-raiz** no centro → assuntos orbitam o root → tópicos orbitam o assunto → conceitos orbitam o tópico → flashcards/notas/baralhos/etc. orbitam o conceito. Clusters de assuntos diferentes se separam entre si; dentro de um assunto, tópicos formam subclusters; dentro de um tópico, conceitos formam miniclusters. Folhas (flashcards, baralhos, notas, …) nunca formam cluster próprio — apenas orbitam.
- **Clusters (por tipo)** — agrupa por tipo de nó (todos os assuntos juntos, todos os tópicos juntos, …). Alternativa não-hierárquica.

### Assunto-raiz

Todo grafo tem um **Assunto-raiz** com o nome do grafo, **fixo no centro**, que ancora o layout — os demais nós orbitam ao seu redor. Ele **não pode ser arrastado nem deletado** individualmente (apenas ao excluir o grafo) e seu nome **espelha o nome do grafo** (renomear o grafo renomeia o root). Grafos antigos ganham o root automaticamente ao serem abertos.

### Parâmetros de física

| Parâmetro | Padrão | Descrição |
|---|---|---|
| Repulsão entre nós | 6000 | Quão forte os nós se afastam uns dos outros. Maior = grafo mais espalhado |
| Gravidade central | 0.06 | Atração de todos os nós para o centro. Maior = grafo mais compacto |
| Rigidez das arestas | 0.018 | Quão forte as relações puxam os nós para o comprimento ideal |
| Atrito | 0.55 | Quão rápido o movimento desacelera. Maior = estabiliza mais rápido |
| Evitar sobreposição | 0.6 | Quanto o tamanho dos nós empurra a repulsão para evitar sobreposição |
| Força orbital | 0.08 | Mantém cada nó na órbita do pai (anéis concêntricos) |
| Repulsão de clusters | 12000 | Empurra clusters/subclusters irmãos uns dos outros |
| Distância mínima entre nós | 10 | Folga rígida garantida entre bordas de nós (pós-integração) |

### Regiões de cluster

O botão **"mostrar regiões"** na barra de ferramentas desenha contornos ao redor dos clusters hierárquicos: uma região grande por **assunto** (cluster principal), médias por **tópico** (subcluster) e pequenas por **conceito** (minicluster), aninhadas. Folhas entram na região do conceito; o root não tem região.

### Destaque de conexões — saltos

Controla quantos saltos o **Modo foco** percorre a partir do nó selecionado. Valor entre 1 e 6.

- **1**: apenas vizinhos diretos (1 aresta de distância)
- **2**: vizinhos e vizinhos dos vizinhos
- **6**: todo o componente conectado acessível em até 6 saltos

Esse mesmo valor é usado pelo **Estudo por vizinhança** no painel de propriedades para determinar quais flashcards coletar.

---

## 8. Painel de propriedades do nó

**Como abrir:** clique em qualquer nó no canvas. O painel aparece à direita.

O painel pode ser recolhido com o botão `‹` no seu topo.

### Informações exibidas

- Badge de tipo (cor + label)
- Label e ID do nó
- Barra de domínio (0–100%)
- Prioridade de revisão
- Pergunta (para `FLASHCARD`)
- Subtipo de conteúdo e papel Zettelkasten (para `NOTA`)
- Estatísticas do baralho: total de cards, cards para revisar hoje (para `BARALHO`)
- **Relações**: lista de arestas de entrada e saída com tipo e nó conectado; clicar em um nó relacionado o seleciona

### Ações disponíveis por tipo

| Ação | Tipos disponíveis | O que faz |
|---|---|---|
| **Editar** | Todos | Abre modal para editar rótulo, conteúdo e metadados do nó |
| **Ver nota** | `NOTA` | Abre modal com o conteúdo Markdown da nota formatado |
| **Ver texto** | `TEXTO_BRUTO` | Abre modal com o texto original |
| **Estudar flashcard** | `FLASHCARD` | Abre sessão SRS para este flashcard individualmente |
| **Ver flashcard** | `FLASHCARD` | Exibe pergunta e resposta sem modo de estudo |
| **Estudar baralho** | `BARALHO` | Abre sessão SRS com todos os flashcards do baralho |
| **Ver baralho** | `BARALHO` | Lista os flashcards do baralho |
| **Estudar vizinhança** | `ASSUNTO` `TOPICO` `CONCEITO` `NOTA` | Coleta todos os flashcards acessíveis em até N saltos (N = focusDepth de Configurações) e abre sessão SRS |
| **Insights da IA** | Todos | Sugere 4–8 novos nós/conexões com base no conteúdo do nó e seus vizinhos diretos |
| **Expandir com IA** | `ASSUNTO` `TOPICO` `CONCEITO` `NOTA` | Gera sub-nós automaticamente (ver tabela abaixo) |
| **Nova relação** | Todos | Abre gerenciador de arestas com este nó como origem |
| **Remover do grafo** | Todos | Desvincula o nó deste grafo sem deletar a entidade |
| **Excluir do app** | Todos | Deleta permanentemente a entidade e todos os vínculos em todos os grafos |

**Expandir com IA — o que é gerado por tipo:**

| Tipo do nó | Nós gerados |
|---|---|
| `ASSUNTO` | `TOPICO`s + `CONCEITO`s |
| `TOPICO` | `CONCEITO`s |
| `CONCEITO` | 1 `NOTA` explicativa + `FLASHCARD`s |
| `NOTA` | `FLASHCARD`s |

**Insights da IA:**
1. Selecione um nó → "Insights da IA" no painel
2. A IA recebe: conteúdo do nó + conteúdo completo dos vizinhos diretos + nomes dos demais nós do grafo
3. Retorna 4–8 insights por categoria (Relacionado, Aprofundamento, Aplicação, Contraste, etc.)
4. Cada insight tem título, descrição e tipo de nó/relação sugerido
5. "Adicionar ao grafo" cria os insights selecionados como nós reais conectados ao nó original

---

## 9. Menus de contexto e multi-seleção

### Menu de contexto (clique direito em nó)

| Opção | Disponível quando | Função |
|---|---|---|
| **Abrir subgrafo →** | Nó do tipo `GRAFO_REF` | Navega para o grafo referenciado |
| **Editar** | Sempre | Abre modal de edição |
| **Remover do grafo** | Sempre | Desvincula sem deletar |
| **Excluir do aplicativo** | Sempre | Deleta permanentemente |

### Menu de multi-seleção

Selecione 2 ou mais nós (Ctrl+clique ou marquee). Um menu flutuante aparece sobre o canvas:

| Opção | Disponível quando | Função |
|---|---|---|
| **Relacionar** | 2+ nós selecionados | Abre gerenciador de arestas com os nós como origem/destino |
| **Extrair como subgrafo** | 2+ nós selecionados | Move os nós para um novo grafo filho |

### Interações no canvas

| Ação | Como fazer |
|---|---|
| Selecionar nó | Clique no nó (ferramenta Selecionar) |
| Adicionar à seleção | Ctrl+clique no nó |
| Seleção por área | Arrastar no fundo vazio (ferramenta Marquee) |
| Deselecionar tudo | Clique no fundo vazio |
| Pan (mover câmera) | Arrastar no fundo vazio (ferramenta Mover) ou scroll com botão do meio |
| Zoom | Scroll do mouse sobre o canvas |
| Mover nó | Arrastar o nó (todas as ferramentas) |

---

## 10. Subgrafos

Um grafo pode referenciar outros grafos através de nós `GRAFO_REF`. A relação é **semântica** — cada referência tem um tipo que descreve como os dois grafos se relacionam conceitualmente.

### Criar subgrafo vazio

**Como acessar:** cabeçalho → botão "Subgrafo" (ícone de rede)

1. Informe o **nome** do novo grafo
2. Informe a **descrição** (opcional)
3. Escolha o **tipo de relação** semântica deste grafo com o subgrafo
4. Clique em **"Criar subgrafo"**

Um nó `GRAFO_REF` violeta aparece no canvas representando o novo grafo filho.

### Extrair nós como subgrafo

Move nós existentes para um novo grafo filho, preservando as relações internas e redirecionando as externas.

**Como acessar:** selecionar 2+ nós → menu flutuante → **"Extrair como subgrafo"**

1. Informe o **nome** do novo grafo
2. Escolha o **tipo de relação** com o grafo pai
3. Clique em **"Extrair N nó(s)"**

**O que acontece internamente:**
- Os nós selecionados são **movidos** para o novo grafo
- Arestas internas (entre nós extraídos) são preservadas no filho
- Arestas externas (entre um nó extraído e um nó que ficou) são **redirecionadas** para o nó `GRAFO_REF` criado no lugar
- Toast: `N nó(s) extraído(s) · M aresta(s) redirecionada(s)`

### Navegar entre grafos

- **Abrir filho:** clique direito no nó `GRAFO_REF` → **"Abrir subgrafo →"**
- **Voltar ao pai:** clique no nome do pai no breadcrumb do cabeçalho

O breadcrumb aparece automaticamente no cabeçalho quando o grafo tem pai:
```
← Álgebra  >  Álgebra Linear
```

---

## 11. Análise estrutural

### Clusters por assunto

Lista os **clusters hierárquicos**: um cluster principal por **assunto**, contendo toda a sua subárvore (tópicos, conceitos e nós comuns) — consistente com as regiões de cluster do canvas.

**Como acessar:** cabeçalho → ícone de rede → painel lateral de clusters

**O que exibe:**
- Lista de clusters com o **nome do assunto**, quantidade de nós e de flashcards
- Cada cluster recebe uma cor única no painel
- Folhas órfãs (sem conceito acima) ficam de fora — nunca formam cluster próprio

**Ações por cluster:**
- **Criar baralho** — gera um `BARALHO` com todos os flashcards do cluster
- **Resumir** — IA gera texto narrativo de 200–500 palavras sobre o cluster (ver seção 13)
- **Hover** — passa o mouse para destacar o cluster no canvas e esmaecê-lo dos demais

### Lacunas estruturais

Detecta pares de clusters sem nenhuma aresta entre si.

**Como acessar:** cabeçalho → ícone de raio (⚡)

O ícone fica **laranja** e exibe o número de lacunas quando alguma é detectada.

**O que exibe:**
- Lista de lacunas, cada uma com os dois clusters envolvidos
- Clicar em uma lacuna: destaca os nós "ponte potencial" de cada lado com uma linha tracejada animada no canvas

**Preencher com IA:** para cada lacuna, chama o LLM para sugerir 4–6 novos nós (`CONCEITO` ou `NOTA`) que conectariam os clusters. As sugestões podem ser selecionadas individualmente antes de adicionar.

### Betweenness centrality

Calculada com o algoritmo de Brandes (O(VE)) sobre o grafo não-dirigido.

**Como acessar:** cabeçalho → ícone de gráfico de barras → painel de analytics → seção "Nós-ponte"

Lista os nós com maior score de centralidade. Nós com score alto são estratégicos: sua remoção mais desconectaria o grafo.

### Estudo por vizinhança (ego network)

Coleta todos os flashcards acessíveis a partir de um nó em até N saltos e abre sessão SRS.

**Como acessar:** selecionar um nó `ASSUNTO` / `TOPICO` / `CONCEITO` / `NOTA` → painel de propriedades → **"Estudar vizinhança"**

A profundidade N é a mesma do parâmetro "Destaque de conexões — saltos" em Configurações.

---

## 12. Roadmap de estudo

**Como acessar:** barra lateral esquerda → ícone de rota (🗺)

O painel abre à direita da barra com duas abas:

### Aba "Por urgência"

Organiza os nós do grafo (assuntos, tópicos, conceitos) em seções por urgência de revisão — domínio baixo + prioridade alta primeiro. Calculado localmente, sem IA.

- Barra de progresso no topo: `N de M dominados` (baseado no nivelDominio)
- Status de cada item:
  - ✓ **Dominado** — domínio ≥ 70%
  - ◐ **Parcial** — domínio entre 1% e 70%
  - ○ **Pendente** — domínio = 0%
- Clicar em qualquer item centraliza o canvas naquele nó e o seleciona

### Aba "Trilha IA"

Gera uma sequência ordenada de estudo usando IA.

1. Clique em **"Gerar trilha"**
2. A IA analisa todos os assuntos, tópicos e conceitos e as relações de dependência (`PREREQUISITO`, `DEPENDE_DE`, `SUBTOPICO_DE`) para ordenar os nós
3. A trilha é exibida como cards navegáveis com botões `←` `→`
4. Cada passo mostra tipo do nó, nome e justificativa da IA
5. Clicar em um passo centraliza o canvas naquele nó

**Salvar trilha:**
- Após gerar, clique em **"Salvar"** para persistir no localStorage do navegador
- A trilha reaparece na próxima visita ao mesmo grafo
- Se o grafo foi modificado desde que foi salva, aparece aviso de desatualização
- **"Remover"** exclui a trilha salva

---

## 13. Automações de IA

**Como acessar:** cabeçalho → dropdown **"IA ▾"**

Todas as automações requerem a IA configurada em **Configurações** (chave API + base URL + modelo). As chamadas são feitas pelo backend — a chave nunca trafega pelo frontend.

O dropdown está dividido em 4 grupos:

### Grupo "Construir"

---

**Gerar grafo por texto** — `IA ▾ > Gerar grafo por texto`

Cria um grafo completo a partir de qualquer material de estudo.

1. Cole ou escreva o texto no campo (capítulo, artigo, resumo, transcrição, etc.)
2. A IA extrai: 1 `ASSUNTO`, N `TOPICO`s, conceitos por tópico, notas e flashcards
3. Todos os nós e relações são criados no grafo
4. Um `BARALHO` com os flashcards gerados é criado automaticamente

---

**Auto-conectar nós** — `IA ▾ > Auto-conectar nós`

Sugere arestas que deveriam existir entre nós já presentes mas não conectados.

1. A IA analisa todos os nós e retorna até 15 sugestões com tipo de relação e justificativa
2. Todas ficam marcadas por padrão — desmarque as indesejadas
3. "Adicionar selecionadas" cria as arestas

---

**Pré-requisitos faltantes** — `IA ▾ > Pré-requisitos faltantes`

Detecta conceitos que deveriam existir como base para o conteúdo atual.

1. A IA analisa `TOPICO`s e `CONCEITO`s e sugere 3–8 nós pré-condição
2. Cada sugestão mostra nome, tipo, motivo e para quais nós existentes se conectaria
3. Clique em **"Adicionar"** em cada item — cria o nó + arestas com relação correta (`PREREQUISITO`, `PERTENCE_A` ou `DEPENDE_DE`)
4. O botão vira "Adicionado ✓" após sucesso

---

### Grupo "Analisar"

**Completude do conhecimento** — `IA ▾ > Completude do conhecimento`

Avalia o quanto cada assunto está coberto no grafo.

1. A IA analisa todos os assuntos e seus tópicos/conceitos
2. Para cada assunto exibe:
   - **Score 0–10** com barra de progresso (verde ≥ 7, amarelo ≥ 4, vermelho < 4)
   - **Bem coberto**: tópicos com boa profundidade
   - **Raso**: áreas presentes com pouco detalhe
   - **Faltando**: conceitos importantes do domínio ainda ausentes
3. "Regerar" solicita nova avaliação

---

### Grupo "Limpar"

**Detectar duplicatas** — `IA ▾ > Detectar duplicatas`

Identifica nós semanticamente equivalentes.

1. A IA agrupa nós com significado equivalente e explica por que são duplicatas
2. Para cada grupo, clique no nó a **manter**
3. "Mesclar grupo" — move todas as arestas dos nós removidos para o nó mantido e os deleta
4. Ou use o ícone de lixeira em cada nó individual para deletar sem mesclar

---

### Grupo "Explorar"

**Chat com o grafo** — `IA ▾ > Chat com o grafo`

Interface de chat onde a IA responde usando o conteúdo do grafo como única fonte.

1. Digite uma pergunta e pressione Enter
2. A IA recebe o conteúdo completo do grafo como contexto e responde em Markdown
3. Cada resposta exibe chips com os nós referenciados (ex: "🔗 Conceito: Regra da Cadeia")
4. Histórico mantido durante a sessão; limpo ao fechar o modal
5. Se o conceito não está no grafo, a IA informa que não encontrou — não inventa

---

### No painel de comunidades

**Resumir comunidade** — painel de comunidades → "Resumir" em qualquer cluster

1. A IA lê o conteúdo de todos os nós do cluster
2. Gera resumo de 200–500 palavras em Markdown, conectando conceitos de forma narrativa
3. O resumo é exibido formatado, com título gerado pela IA
4. "Copiar" copia para a área de transferência

---

### No painel de lacunas

**Preencher lacuna com IA** — painel de lacunas → "Preencher com IA" em qualquer lacuna

1. A IA recebe os dois clusters sem conexão como contexto
2. Sugere 4–6 novos nós que fariam a ponte semântica
3. Selecione as sugestões desejadas e clique "Adicionar ao grafo"

---

### No painel de propriedades do nó

**Insights da IA** — selecionar nó → painel de propriedades → "Insights da IA"

Ver seção [8. Painel de propriedades do nó](#8-painel-de-propriedades-do-nó).

**Expandir com IA** — selecionar nó → painel de propriedades → "Expandir com IA"

Ver seção [8. Painel de propriedades do nó](#8-painel-de-propriedades-do-nó).

---

## 14. Notas — tipos de conteúdo (SubtipoNota)

As notas têm dois eixos independentes:

- **Papel Zettelkasten** (`tipoNota`): `PASSAGEIRA`, `LITERATURA`, `PERMANENTE`, `ESTRUTURA` — descreve o *papel* da nota no sistema de conhecimento
- **Tipo de conteúdo** (`subtipo`): descreve *o que* a nota é, independente do papel

| Subtipo | Ícone | Descrição | Template gerado automaticamente |
|---|---|---|---|
| `DEFINICAO` | Livro | Definição precisa e formal | `**[Conceito]**: [definição]` + Características + Distinções |
| `EXPLICACAO` | Mensagem | Como funciona ou por que existe | Seções "Por quê", "Como funciona", "Implicações" |
| `EXEMPLO` | Lâmpada | Exemplo concreto e aplicado | Contexto + Exemplo + Por que funciona |
| `COMPARACAO` | Merge | Comparação entre dois ou mais itens | Tabela `Aspecto / A / B` + Quando usar cada |
| `SINTESE` | Alerta | Integração de múltiplas ideias | Lista de conceitos + Conclusão |
| `PREREQUISITO` | Seta-up | Pré-condição para entender outro conceito | O que é o conceito base + Por que precisa saber antes |
| `ERRO_COMUM` | Triângulo | Erro frequente e como evitá-lo | Erro + Causa raiz + Solução/prevenção |
| `APLICACAO` | Zap | Aplicação prática de um conceito | Problema + Como aplicar + Resultado esperado |

**Como usar ao criar uma nota** (`/notes/new`):

1. O Passo 1 exibe os 8 tipos em grade 2×4
2. Clicar em um tipo seleciona o subtipo e preenche o campo de conteúdo com o template
3. O template pode ser editado livremente
4. O subtipo é exibido como **badge violeta** na lista de notas e no cabeçalho da nota individual
5. O subtipo é opcional — notas sem subtipo funcionam normalmente

A ortogonalidade permite, por exemplo, uma nota `PERMANENTE` (papel) do tipo `COMPARACAO` (conteúdo), ou uma nota `LITERATURA` (papel) do tipo `ERRO_COMUM` (conteúdo).

---

## 15. Vault sync

Disponível apenas no **app desktop** (Electron).

**Como acessar:** cabeçalho → botão "Vault" (ícone de pasta 🗂)

O vault é uma pasta local de arquivos `.md` compatível com Obsidian. Cada grafo tem sua própria subpasta no formato `<slug>--<id>/`.

### Push (grafo → vault)

Exporta todos os nós do grafo como arquivos `.md` com frontmatter YAML (tipo, id, relações, metadados). A estrutura segue PARA (Projects / Areas / Resources / Archives).

### Pull (vault → grafo)

- Detecta arquivos modificados desde o último Pull
- Exibe conflitos (arquivo modificado no vault E no grafo) antes de sobrescrever
- Novos nós do vault são inseridos preservando as posições dos nós existentes no canvas
- O timestamp do último Pull/Push é exibido no modal

---

## 16. Importação e exportação JSON

### Importar JSON

**Como acessar:** barra lateral esquerda → ícone `{}` (Importar JSON)

Formato esperado:

```json
{
  "nodes": [
    {
      "ref": "id-unico",
      "tipo": "CONCEITO",
      "nome": "Regra da Cadeia",
      "descricao": "...",
      "subtipo": "DEFINICAO"
    }
  ],
  "edges": [
    {
      "origem": "ref-a",
      "destino": "ref-b",
      "relacao": "PREREQUISITO",
      "peso": 1
    }
  ]
}
```

Nós com o mesmo `ref` já existentes são reusados sem duplicar.

### Exportar JSON

O mesmo endpoint que o import, com campos adicionais `posicaoX`, `posicaoY` e `nivelDominio` para preservar o layout ao reimportar. Acessível programaticamente via `GET /graph/graphs/:id/export`.

---

## 17. Excluir um grafo

**Como acessar:** página **"Meus Grafos"** → ícone de lixeira no card do grafo.

Abre um modal que sempre apaga as entidades **estruturais** do grafo (assunto-raiz, assuntos, tópicos e conceitos) e deixa você escolher, por tipo, quais entidades **reutilizáveis** preservar no sistema:

- Flashcards, Notas, Baralhos, Questões, Provas, Textos brutos — checkbox por tipo, **marcado (manter) por padrão**.
- Itens desmarcados têm a entidade apagada junto com o grafo.

**Segurança:** uma entidade compartilhada com outro grafo **nunca** é apagada — apenas desvinculada deste grafo (evita quebrar os demais). Flashcards mantidos são destacados dos conceitos antes da exclusão para não serem levados pelo cascade.

API: `DELETE /graph/graphs/:id?keep=FLASHCARD,NOTA,...` (lista de tipos a preservar).
