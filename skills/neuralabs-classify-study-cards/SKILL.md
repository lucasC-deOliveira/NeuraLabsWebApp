---
name: neuralabs-classify-study-cards
description: Classifica um flashcard ou um baralho nos assuntos, tópicos e conceitos do grafo NeuraLabs. Use para sugerir vínculos de cartões existentes ou planejar a estrutura de um grafo a partir deles.
---

# Classificar cartões no grafo

1. Identifique o grafo de destino e o cartão ou baralho. Localize os cartões no Markdown do grafo ou na biblioteca de estudo do vault, em `.neuralabs/study/NeuraLabs.study.json` ou no arquivo legado `NeuraLabs.study.json` na raiz. Em baralhos grandes, filtre localmente e comece por até 30 cartões pendentes. Use IDs estáveis para retomar o trabalho.
2. Compare pergunta e resposta para identificar o conceito que cada cartão ensina ou testa. Busque os conceitos no índice `Projects/neuralabs-graph-<id>.md` e abra somente os candidatos relevantes. Use a hierarquia assunto, tópico e conceito. Reaproveite conceitos por ID e agrupe cartões que abordam a mesma ideia.
3. Mostre cada ID de cartão, os conceitos sugeridos e o motivo. Quando faltar um conceito, proponha seu nome e a posição na hierarquia, indicando quais cartões o sustentam. Marque como pendentes os cartões ambíguos, sem forçar um vínculo. Preserve o conteúdo, o agendamento e o histórico dos cartões.
4. Entregue a classificação para seleção e continue por lotes no caso de um baralho. Para materializar a classificação dos cartões, use o fluxo do NeuraLabs. Quando forem necessárias inclusões compatíveis de conceitos no vault, prepare uma proposta pela [skill de grafo](../neuralabs-graph/SKILL.md).
