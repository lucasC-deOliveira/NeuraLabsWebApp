---
name: neuralabs-missing-prerequisites
description: Identifica fundamentos ainda ausentes ou sem vínculo para estudar tópicos e conceitos do grafo NeuraLabs. Use quando o usuário quiser saber o que precisa aprender antes de um conteúdo específico.
---

# Identificar pré-requisitos faltantes

1. Localize o conteúdo-alvo no índice `Projects/neuralabs-graph-<id>.md`. Abra o tópico ou conceito, seus pré-requisitos registrados e só as notas e fontes necessárias para identificar o conhecimento que o conteúdo pressupõe.
2. Para cada fundamento candidato, explique qual parte do conteúdo depende dele. Procure sinônimos no índice e confira as relações no grafo selecionado. Se o fundamento existir, reaproveite o ID e proponha um vínculo apenas se ainda faltar. Proponha um conceito novo somente quando o fundamento necessário estiver ausente no recorte consultado.
3. Confira a direção. `A PREREQUISITO B` ou `A FUNDAMENTA B` põe A antes de B. `A DEPENDE_DE B` põe B antes de A. `PERTENCE_A` expressa pertencimento. Antes de sugerir uma dependência, siga a cadeia relevante e sinalize ciclos ou trechos que não pôde confirmar.
4. Entregue uma lista curta com fundamento, conteúdo que depende dele, motivo e fonte, relação proposta e status de existência. Se o usuário selecionar sugestões, prepare a prévia pela [skill de grafo](../neuralabs-graph/SKILL.md) e valide tipos, direção e escopo antes da gravação.
