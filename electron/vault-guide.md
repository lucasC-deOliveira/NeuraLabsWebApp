# NeuraLabs — PARA compartilhado

## Consultar o acervo de fora do app

Abra a raiz do vault como espaço de trabalho. Os arquivos Markdown são suficientes para buscar, ler e citar o conteúdo sem abrir o NeuraLabs nem consultar o backend.

1. Para um grafo específico, localize o índice pelo título em `Projects/neuralabs-graph-*.md`. Os wikilinks do índice indicam quais notas pertencem àquele grafo.
2. Para uma busca geral, procure por título e conteúdo nas quatro pastas PARA da raiz. Use o frontmatter `tipo` para filtrar a entidade e `tipoNota` para filtrar o papel Zettelkasten.
3. Siga os wikilinks para abrir os arquivos `<id>.md`. Em `[[id|Título]]`, use o ID para localizar o arquivo e o título para exibir a referência. Um mesmo ID pode aparecer em vários índices.
4. Ao responder ou reaproveitar conteúdo, cite os arquivos realmente consultados pelo caminho relativo ao vault ou por wikilink.

Use `.neuralabs-legacy/` como backup. Priorize os arquivos do PARA da raiz para evitar recuperar cópias antigas.

## Organizar e editar

- `Projects/` contém provas, baralhos e os índices dos grafos. `Areas/` contém áreas de estudo.
- `Resources/` reúne conceitos, notas, questões, flashcards e fontes. `Archives/` pode guardar material arquivado.
- Cada entidade tem um arquivo `<id>.md`. Mantenha o ID estável ao editar o título. Use `[[id|Título]]` para criar links.
- Em uma nota permanente, desenvolva uma ideia por arquivo e faça links para ideias relacionadas e suas fontes.
- Os papéis das notas são `PASSAGEIRA`, `LITERATURA`, `PERMANENTE` e `ESTRUTURA`.
- Edite os vínculos e as relações pelo grafo no NeuraLabs. O índice em `Projects/` lista seus membros.
- Para retirar um item de um grafo, desvincule-o no app para preservar o arquivo compartilhado.
- A pasta `.neuralabs/` guarda o estado interno do app. Para consultar o acervo, use os índices em `Projects/` e o Markdown do PARA.

## Bibliografia

- Guarde livros, artigos e outros documentos bibliográficos em `Resources/Bibliografia/Arquivos/`. Mantenha provas, simulados e gabaritos em `Resources/provas/`.
- Crie uma ficha Markdown por obra em `Resources/Bibliografia/Fichas/`, com o título, os dados bibliográficos disponíveis e um link para o arquivo original.
- Nas notas de literatura, aponte para a ficha e indique a página, seção ou capítulo usado. Nas notas permanentes, aponte para as notas de literatura ou fichas que sustentam a ideia.
- Ao consultar uma referência, siga o percurso do índice do grafo até a nota, a ficha e o documento original. Reutilize a ficha e o arquivo existentes quando a obra servir a mais de um grafo.
