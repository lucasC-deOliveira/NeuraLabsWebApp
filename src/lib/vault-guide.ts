// Conteúdo do AGENTS.md escrito na raiz do vault. AGENTS.md é lido
// automaticamente pelo Claude Code, então ele entra com as regras do grafo ao
// abrir a pasta. Apenas monta a string — a escrita no disco é via IPC (Electron).
import { RELATION_PAIRS } from "@/modules/graph/domain/services/relation-rules";
import { RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";
import { PARA_FOLDERS } from "./vault-format";

export const VAULT_GUIDE_FILENAME = "AGENTS.md";

function relationsSection(): string {
  return RELATION_PAIRS.map((p) => {
    const rels = p.relations.map((r) => `\`${r}\` (${RELATION_LABELS[r] ?? r.toLowerCase()})`).join(", ");
    return `- **${p.a} → ${p.b}**: ${rels}`;
  }).join("\n");
}

export function buildVaultGuide(): string {
  return `# Grafo de Conhecimento — guia do vault (para o Claude Code)

Este vault guarda um **grafo de conhecimento** como arquivos Markdown. Você (Claude)
modela o grafo conforme o usuário pede, **editando estes \`.md\`**. No app desktop,
use **Pull** para baixar o grafo do backend para esta pasta e **Push** para enviar
suas mudanças de volta ao backend.

## Estrutura de pastas (PARA)

\`\`\`
${PARA_FOLDERS.join("/\n")}/
\`\`\`

Cada **nó** é um arquivo \`.md\` numa dessas pastas, conforme o tipo:

| Tipo (\`tipo\`) | Pasta | O que é |
| --- | --- | --- |
| \`BARALHO\` | \`Projects/\` | Baralho de flashcards (estudo) |
| \`PROVA\` | \`Projects/\` | Prova/simulado (coleção de questões) |
| \`ASSUNTO\` | \`Areas/\` | Matéria/área de estudo |
| \`TOPICO\` | \`Resources/\` | Tópico dentro de um assunto |
| \`CONCEITO\` | \`Resources/\` | Conceito |
| \`NOTA\` | \`Resources/\` | Nota (Zettelkasten) |
| \`FLASHCARD\` | \`Resources/\` | Flashcard (pergunta/resposta) |
| \`QUESTION\` | \`Resources/\` | Questão de prova (enunciado/alternativas/gabarito) |
| \`TEXTO_BRUTO\` | \`Resources/\` | Texto original/fonte |

Nome do arquivo: \`<slug-do-titulo>--<id>.md\`. O **\`id\`** (no frontmatter) é a
fonte da verdade e **não deve mudar** — ele liga o nó aos dados de estudo (SRS)
no backend. Ao criar um nó novo, gere um \`id\` único.

## Formato de cada arquivo

Frontmatter YAML + corpo Markdown:

\`\`\`markdown
---
id: 0e6c1f2a-...           # único e estável
tipo: CONCEITO             # um dos tipos acima
grafo: <id-do-grafo>       # a qual grafo pertence
titulo: Habeas Corpus      # nome/título exibido
nivelDominio: 0            # 0..1 (calculado pelo app)
posicao: { x: 0, y: 0 }    # opcional
relacoes:                  # arestas de SAÍDA deste nó (opcional)
  - rel: PERTENCE_A
    alvo: "[[<id-do-no-destino>]]"
    peso: 1
---

Corpo livre em Markdown (ver por tipo abaixo).
\`\`\`

### Corpo por tipo
- **CONCEITO/TOPICO/ASSUNTO**: descrição (texto livre, opcional).
- **NOTA**: o conteúdo da nota (Markdown).
- **FLASHCARD**: duas seções \`## Pergunta\` e \`## Resposta\`.
- **TEXTO_BRUTO**: o texto original.
- **BARALHO**: corpo vazio.
- **PROVA**: descrição da prova (opcional). As questões entram por \`CONTEM\`.
- **QUESTION**: seções \`## Enunciado\`, \`## Alternativas\`, \`## Gabarito\` e
  \`## Explicação\` (as duas últimas seções são opcionais para verdadeiro/falso).

\`\`\`markdown
---
id: <id-unico>
tipo: QUESTION
grafo: <id-do-grafo>
titulo: "Um trecho do enunciado"   # gerado a partir do enunciado
tipoQuestao: MULTIPLA_ESCOLHA      # ou VERDADEIRO_FALSO
relacoes:
  - rel: TESTA
    alvo: "[[<id-do-conceito>]]"
    peso: 1
---

## Enunciado

Texto do enunciado.

## Alternativas

- (A) primeira
- (B) segunda
- (C) terceira

## Gabarito

C

## Explicação

Por que a C está certa.
\`\`\`

A ordem das questões dentro de uma \`PROVA\` **não** fica no arquivo: quem já está
na prova mantém a posição, e questões novas entram no fim.

## Relações (arestas)

Uma aresta é uma entrada em \`relacoes\` no nó de **origem**, apontando para o
\`id\` do **destino** via wikilink \`[[id]]\`, com um \`peso\` (0.1 a 2; 1 = normal).
A relação tem **direção** (origem → destino) e só é válida entre certos tipos:

${relationsSection()}

Se uma relação não estiver na lista acima para o par de tipos, **não a crie** —
o app a rejeita no Push.

## Operações
- **Criar nó**: novo \`.md\` na pasta do tipo, com \`id\` único, \`tipo\`, \`grafo\` e \`titulo\`.
- **Editar nó**: altere frontmatter/corpo. **Não mude o \`id\`**.
- **Excluir nó**: apague o arquivo \`.md\`. No próximo Push o nó é removido do grafo
  (a entidade e os dados de estudo são preservados no backend). Remova também as
  \`relacoes\` em outros arquivos que apontem para o \`id\` dele.
- **Criar/editar aresta**: edite \`relacoes\` no nó de origem.

_(Arquivo gerado pelo app — pode ser regenerado a cada Pull.)_
`;
}
