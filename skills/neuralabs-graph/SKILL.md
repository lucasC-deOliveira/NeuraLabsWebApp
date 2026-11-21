---
name: neuralabs-graph
description: Planeja e amplia um grafo existente no vault do NeuraLabs a partir de notas, livros, editais ou texto. Use para reaproveitar entidades por ID, propor conceitos ou notas com fontes, validar relações e revisar o impacto antes de aplicar.
---

# Planejar alterações em um grafo

1. Abra o `AGENTS.md` do vault e localize a nota-índice em `Projects/neuralabs-graph-<id>.md`. Confira os IDs e leia os Markdowns relevantes.
2. Use `node .neuralabs/tools/neuralabs-graph.cjs inspect "." <id> "<termo do título>"` para obter a revisão do grafo e confirmar a existência de nós e relações. Pesquise também o conteúdo no PARA e siga os wikilinks.
3. Consulte os documentos originais. Identifique página, capítulo ou seção de cada fonte. Reaproveite os IDs que já representam as ideias. Proponha conteúdo novo quando acrescentar uma ideia ou uma síntese útil.
4. Escreva a proposta JSON conforme [o contrato e o exemplo](references/proposal.md). Guarde o rascunho em `.neuralabs/proposals/`.
5. Use `preview`. Apresente ao usuário as fontes, o que será criado ou reutilizado, as relações e os grafos afetados por edições compartilhadas.
6. Após o usuário aprovar a proposta, use `apply` com o código retornado pelo `preview`. Se algum arquivo tiver mudado, revise a proposta e apresente uma nova prévia.

O comando local valida as relações com as regras do NeuraLabs e atualiza os Markdowns e vínculos. Esse fluxo funciona com Node.js a partir do vault.
