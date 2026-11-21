---
name: neuralabs-auto-connect
description: Sugere relações entre nós existentes de um grafo NeuraLabs. Use para revisar um tópico ou conjunto de nós e conectar ideias já registradas no vault.
---

# Sugerir conexões entre nós existentes

1. Delimite um tópico, uma comunidade ou uma lista de nós no grafo indicado. Use o índice `Projects/neuralabs-graph-<id>.md` para obter os IDs e abra apenas as notas necessárias para avaliar as conexões. Em grafos grandes, faça a revisão por recorte.
2. Compare os candidatos pelo conteúdo. Confira as relações existentes no grafo selecionado, inclusive no sentido inverso. Um vínculo inverso só deve ser sugerido se o tipo e a direção tiverem significado próprio. Evite repetir uma relação ou ligar nós apenas pela semelhança de títulos.
3. Apresente até 15 pares, priorizando os mais úteis. Para cada par, mostre origem, destino, tipo, direção e uma justificativa baseada nas notas. Use somente IDs existentes no grafo escolhido. Se nenhuma relação nova se justificar, informe isso.
4. Depois que o usuário escolher as sugestões, use a [skill de grafo](../neuralabs-graph/SKILL.md) com uma proposta de relações. O `preview` verifica tipos, direções e duplicatas. Aplique depois da aprovação da prévia.
