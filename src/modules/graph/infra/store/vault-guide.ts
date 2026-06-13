import { promises as fs } from "fs";
import path from "path";
import { RELATION_PAIRS } from "@/modules/graph/domain/services/relation-rules";
import { RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";
import { PARA_FOLDERS } from "./vault-format";

// Nome do guia escrito na raiz do vault. AGENTS.md é lido automaticamente pelo
// Claude Code, então ele já entra com as regras do grafo ao abrir a pasta.
export const VAULT_GUIDE_FILENAME = "AGENTS.md";

function relationsSection(): string {
  const lines: string[] = [];
  for (const p of RELATION_PAIRS) {
    const rels = p.relations.map((r) => `\`${r}\` (${RELATION_LABELS[r] ?? r.toLowerCase()})`).join(", ");
    lines.push(`- **${p.a} → ${p.b}**: ${rels}`);
  }
  return lines.join("\n");
}

export function buildVaultGuide(): string {
  return `# Grafo de Conhecimento — guia do vault (para o Claude Code)

Este vault guarda um **grafo de conhecimento** como arquivos Markdown. Você (Claude)
modela o grafo conforme o usuário pede, **editando estes \`.md\`** — o app lê e grava
exatamente esta pasta quando está no modo "Sistema de arquivos (Markdown)".

> O app lê os arquivos **ao vivo**: o que você escrever aqui aparece no grafo.

## Estrutura de pastas (PARA)

\`\`\`
${PARA_FOLDERS.join("/\n")}/
\`\`\`

Cada **nó** é um arquivo \`.md\` numa dessas pastas, conforme o tipo:

| Tipo (\`tipo\`) | Pasta | O que é |
| --- | --- | --- |
| \`BARALHO\` | \`Projects/\` | Baralho de flashcards (estudo) |
| \`ASSUNTO\` | \`Areas/\` | Matéria/área de estudo |
| \`TOPICO\` | \`Resources/\` | Tópico dentro de um assunto |
| \`CONCEITO\` | \`Resources/\` | Conceito |
| \`NOTA\` | \`Resources/\` | Nota (Zettelkasten) |
| \`FLASHCARD\` | \`Resources/\` | Flashcard (pergunta/resposta) |
| \`TEXTO_BRUTO\` | \`Resources/\` | Texto original/fonte |

Nome do arquivo: \`<slug-do-titulo>--<id>.md\`. O **\`id\`** (no frontmatter) é a
fonte da verdade e **não deve mudar** — ele liga o nó aos dados de estudo (SRS)
no banco. Ao criar um nó, gere um \`id\` novo e único (UUID).

## Formato de cada arquivo

Frontmatter YAML + corpo Markdown:

\`\`\`markdown
---
id: 0e6c1f2a-...           # único e estável (UUID)
tipo: CONCEITO             # um dos tipos acima
grafo: <id-do-grafo>       # a qual grafo pertence (veja abaixo)
titulo: Habeas Corpus      # nome/título exibido
nivelDominio: 0            # 0..1 (calculado pelo app; pode deixar 0)
posicao: { x: 0, y: 0 }    # opcional (posição no canvas)
relacoes:                  # arestas de SAÍDA deste nó (opcional)
  - rel: PERTENCE_A
    alvo: "[[<id-do-no-destino>]]"
    peso: 1
---

Corpo livre em Markdown (ver por tipo abaixo).
\`\`\`

### Corpo por tipo
- **CONCEITO/TOPICO/ASSUNTO**: descrição (texto livre, opcional).
- **NOTA**: o conteúdo da nota (Markdown). Use também \`tipoNota\`
  (\`LITERATURA\`/\`PERMANENTE\`/\`ESTRUTURA\`) e \`subtipo\` no frontmatter.
- **FLASHCARD**: duas seções:
  \`\`\`markdown
  ## Pergunta

  ...

  ## Resposta

  ...
  \`\`\`
- **TEXTO_BRUTO**: o texto original.
- **BARALHO**: corpo vazio.

## Relações (arestas)

Uma aresta é uma entrada em \`relacoes\` no nó de **origem**, apontando para o
\`id\` do **destino** via wikilink \`[[id]]\`, com um \`peso\` (0.1 a 2; 1 = normal).
A relação tem **direção** (origem → destino) e só é válida entre certos tipos:

${relationsSection()}

Se uma relação não estiver na lista acima para o par de tipos, **não a crie** —
o app a rejeita.

## Como modificar o grafo (operações)

- **Criar nó**: crie um \`.md\` na pasta do tipo, com \`id\` novo, \`tipo\`, \`grafo\`
  (igual ao dos outros nós do mesmo grafo) e \`titulo\`.
- **Editar nó**: altere o frontmatter/corpo. **Não mude o \`id\`**.
- **Excluir nó**: apague o arquivo **e** remova de TODOS os outros arquivos as
  entradas em \`relacoes\` que apontem para o \`id\` dele (arestas de entrada).
- **Criar aresta**: adicione uma entrada em \`relacoes\` no nó de origem.
- **Editar/remover aresta**: edite/remova a entrada em \`relacoes\` da origem.
- **Mover nó**: ajuste \`posicao\`.

## Limites e o que NÃO mexer

- O campo \`grafo\` referencia um grafo gerenciado pelo app (a lista de grafos,
  nomes e zoom/pan ficam no **banco**, não aqui). Use um \`grafo\` que já exista
  nos arquivos; não invente grafos novos por conta própria.
- Dados de **estudo/SRS** (revisões, agendamento) ficam no banco, ligados pelo
  \`id\` do flashcard — por isso o \`id\` não pode mudar.
- Mantenha **títulos únicos** por tipo quando possível (ajuda a evitar confusão).

_(Arquivo gerado pelo app ao configurar o vault — pode ser regenerado.)_
`;
}

/**
 * Prepara o vault: cria as pastas PARA e escreve o guia para o Claude Code.
 * Chamado ao selecionar o modo Markdown nas configurações.
 */
export async function initVault(vaultPath: string): Promise<void> {
  for (const folder of PARA_FOLDERS) {
    await fs.mkdir(path.join(vaultPath, folder), { recursive: true });
  }
  await fs.writeFile(path.join(vaultPath, VAULT_GUIDE_FILENAME), buildVaultGuide(), "utf8");
}
