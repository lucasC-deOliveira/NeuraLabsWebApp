---
name: neuralabs-exam-review
description: Prepara questões de uma prova para revisão no NeuraLabs. Use para extrair ou conferir enunciados e gabaritos de documentos locais e sugerir os conceitos do grafo que cada questão avalia.
---

# Preparar questões de prova

1. Confirme o caderno e, quando houver, o gabarito correspondente pela edição, cargo, dia e versão que estiverem nos documentos. Se houver um gabarito definitivo correspondente, use-o. Trabalhe pelas páginas ou questões selecionadas. Em uma prova inteira, percorra os blocos em sequência, acompanhando intervalos, números ausentes e questões repetidas.
2. Preserve o número original, enunciado, alternativas e texto de apoio. Registre página e referência de figuras ou tabelas. Se uma figura estiver ausente, um trecho estiver ilegível ou uma questão atravessar páginas, sinalize a pendência para revisão. Confira o documento antes de corrigir conteúdo que parece erro de extração.
3. Classifique como `MULTIPLA_ESCOLHA` ou `VERDADEIRO_FALSO`, quando aplicável. Transcreva a alternativa oficial ou normalize certo/errado para `V`/`F`. Use `ANNULLED` para anulações confirmadas e `?` para gabaritos ausentes ou não confirmados. Registre a página do gabarito. Uma resolução sugerida deve ficar identificada separadamente.
4. No índice `Projects/neuralabs-graph-<id>.md`, procure os conceitos que a questão exige para ser resolvida e abra só os candidatos relevantes. Sugira `QUESTION → TESTA → CONCEITO` com o ID real do conceito e uma justificativa breve. Use mais de um conceito quando cada um for necessário. Sinalize a lacuna se nenhum conceito existente servir.
5. Entregue uma prévia com título, páginas cobertas, questões extraídas e pendências. Para cada questão, inclua número, página, tipo, enunciado, alternativas quando houver, gabarito com fonte e conceitos sugeridos. Para incorporar os documentos, use o fluxo existente de importação de prova do NeuraLabs. A associação prova–questão dá origem à relação `CONTEM` no app.
