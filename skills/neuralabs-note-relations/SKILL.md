---
name: neuralabs-note-relations
description: Sugere onde um rascunho de nota Zettelkasten se encaixa no grafo NeuraLabs. Use ao criar ou editar uma nota para vinculá-la a conceitos, tópicos ou assuntos existentes.
---

# Sugerir relações para uma nota

1. Leia o título e o conteúdo da nota. Identifique sua ideia central e use termos específicos e sinônimos para pesquisar no índice `Projects/neuralabs-graph-<id>.md`. Abra só os candidatos relevantes do grafo selecionado.
2. Use a nota como origem e nós existentes do tipo `CONCEITO`, `TOPICO` ou `ASSUNTO` como destino. Confirme os IDs e, se a nota já existir, verifique os vínculos registrados nesse grafo.
3. Sugira até oito relações pertinentes. Escolha o vínculo pelo que a nota faz: por exemplo, `SINTETIZA` quando ela resume um conceito e `PERTENCE_A` quando ela integra um tópico. Para cada sugestão, dê o destino com link e ID, o tipo de relação e um motivo baseado no conteúdo. Se não houver um destino apropriado, informe isso.
4. Depois que o usuário escolher as relações, use a [skill de grafo](../neuralabs-graph/SKILL.md) para validar tipos, direções e duplicatas na prévia. Se for um rascunho, inclua a criação da nota na mesma proposta para que conteúdo e vínculos sejam aplicados juntos após aprovação.
