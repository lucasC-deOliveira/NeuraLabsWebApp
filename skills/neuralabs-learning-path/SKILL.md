---
name: neuralabs-learning-path
description: Monta uma trilha de aprendizado a partir dos nós existentes no grafo NeuraLabs. Use para decidir o que estudar primeiro, priorizar conceitos para uma prova ou organizar o estudo de um tópico pelo vault.
---

# Montar uma trilha de aprendizado

1. Comece pelo objetivo do usuário e pelo índice `Projects/neuralabs-graph-<id>.md`. Pesquise o tópico no índice e siga os links para os Markdowns relevantes. Em grafos grandes, comece pelo tópico escolhido, pelos conceitos diretamente ligados e pelos pré-requisitos desses conceitos. Amplie o recorte quando faltar uma dependência necessária.
2. Confirme as relações no grafo selecionado. Se o Markdown ou o índice não bastar para confirmar uma relação, use `node .neuralabs/tools/neuralabs-graph.cjs inspect "." <id-do-grafo> "<termo específico>"`. Confira o ID e a direção dos vínculos. Em `A DEPENDE_DE B`, estude B primeiro. Em `A PREREQUISITO B` ou `A FUNDAMENTA B`, estude A primeiro. Vínculos como `PERTENCE_A` e `SINTETIZA` ajudam a encontrar material, mas não impõem ordem. Se houver um ciclo, sinalize-o e agrupe os nós afetados.
3. Ordene do fundamento à aplicação. Se houver dados de provas anteriores ou do edital no recorte, use-os para priorizar os conceitos cujos pré-requisitos já foram cobertos. Quando a ordem vier de julgamento pedagógico, identifique isso na resposta.
4. Entregue uma lista numerada com links para os nós existentes. Para cada passo, dê um motivo curto e uma atividade verificável. Se houver um baralho local pertinente, indique-o como prática. Por padrão, entregue a trilha na conversa. Salve-a como Markdown no vault quando o usuário pedir.
