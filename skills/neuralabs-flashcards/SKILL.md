---
name: neuralabs-flashcards
description: Gera flashcards de uma nota do grafo NeuraLabs e prepara sua inclusão em um baralho local para estudo offline. Use para criar, revisar ou importar cartões no vault.
---

# Criar flashcards de uma nota

1. Use o índice do grafo para encontrar a nota. Leia a nota canônica em `Resources/<id>.md`, o conceito diretamente vinculado e apenas os trechos das fontes necessários para conferir as respostas. Se o usuário indicar um conceito, comece por uma nota vinculada a ele.
2. Escreva cartões em português, com uma ideia por cartão e respostas verificáveis. Comece com até cinco. Compare o conteúdo com os cartões do baralho de destino quando já existir. O comando também verifica perguntas idênticas após normalização e IDs repetidos.
3. Prepare o JSON conforme o exemplo abaixo e salve-o em `.neuralabs/proposals/`. Use o ID de um baralho escolhido pelo usuário ou proponha um baralho novo. Cada cartão deve apontar para um conceito vinculado na nota e citar um trecho literal dela no campo `evidence`.
4. Na raiz do vault execute `node .neuralabs/tools/neuralabs-flashcards.cjs preview "." ".neuralabs/proposals/<arquivo>.json"`. Apresente as perguntas, respostas, fonte e baralho ao usuário. Se ele escolher parte dos cartões, ajuste o JSON e gere outra prévia.
5. Após a aprovação da prévia, com o Electron fechado para evitar uma gravação simultânea de estudo, troque `preview` por `apply` e acrescente o código `confirmation` ao fim. Se a nota ou a biblioteca tiver mudado, gere outra prévia. Os cartões novos ficam disponíveis no vault para estudo offline e começam sem histórico.

```json
{
  "version": 1,
  "noteId": "20f2a52b-554d-40af-a829-8d893e3cba69",
  "target": { "existingDeckId": "id-do-baralho" },
  "cards": [
    {
      "id": "2f7410bb-a74a-4e5e-bd34-567e09f3fee4",
      "question": "Por que se escreve «deve haver vagas»?",
      "answer": "Haver, no sentido de existir, é impessoal. A impessoalidade alcança o auxiliar, que fica no singular.",
      "type": "pergunta_resposta",
      "conceptId": "2958b812-13a7-43c3-9366-d669b1cdca7f",
      "evidence": "Em locução, a impessoalidade alcança o auxiliar."
    }
  ]
}
```

Para um baralho novo, use `target: { "newDeckId": "<UUID>", "title": "<título>" }`. Os tipos aceitos são `pergunta_resposta`, `cloze`, `comparacao`, `aplicacao_problema` e `erro_comum`. O comando requer Node.js e usa o mesmo arquivo de estudo do Electron. O vínculo por ID e a evidência ficam registrados na proposta.
