---
name: neuralabs-node-insights
description: Analisa um nó do grafo NeuraLabs e sugere relações que acrescentem contexto, aprofundamento ou aplicação. Use quando o usuário pedir conexões, lacunas ou próximos vínculos para um nó existente no vault.
---

# Analisar um nó do grafo

1. Localize o nó pelo índice `Projects/neuralabs-graph-<id>.md` e leia seu Markdown. Use o grafo selecionado para conferir os vínculos, pois um conceito compartilhado pode ter relações diferentes em outro grafo.
2. Comece pelos vizinhos diretos e pesquise no índice termos específicos que possam revelar um vínculo ausente. Abra somente os candidatos relevantes. Se precisar confirmar relações no grafo e o índice não bastar, rode `node .neuralabs/tools/neuralabs-graph.cjs inspect "." <id-do-grafo> "<termo específico>"`.
3. Sugira até três vínculos que acrescentem algo ao nó. Procure oportunidades de relacionar conteúdo próximo, aprofundar um detalhe, ligar outra área ou mostrar uma aplicação. Reaproveite nós por ID e descarte relações já registradas ou justificadas apenas pela semelhança dos títulos. Se uma ideia útil ainda não tiver nó, identifique-a como sugestão de criação e cite a evidência.
4. Mostre o nó de origem, o destino, a direção da relação e uma justificativa baseada no conteúdo. Se o recorte não sustentar uma relação nova, informe isso.
5. Se o usuário quiser preparar uma alteração, use o fluxo da [skill de grafo](../neuralabs-graph/SKILL.md). O comando `preview` valida os tipos e as direções no grafo selecionado. Aplique somente depois da aprovação da prévia.
