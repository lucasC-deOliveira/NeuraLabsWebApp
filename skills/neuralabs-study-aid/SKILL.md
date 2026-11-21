---
name: neuralabs-study-aid
description: Dá uma dica socrática ou cria um mnemônico para um flashcard do NeuraLabs durante o estudo. Use quando o usuário travar numa pergunta ou quiser fixar uma resposta.
---

# Ajudar durante o estudo de um flashcard

Use somente o cartão em foco. Se o usuário já trouxe o enunciado ou a resposta necessária, trabalhe com esse texto. Se precisar buscar no vault, use o baralho e o ID ou a pergunta do cartão. O armazenamento de estudo fica em `.neuralabs/study/NeuraLabs.study.json`, com `NeuraLabs.study.json` na raiz como localização legada. Selecione os campos do cartão localmente antes de trazê-los à conversa.

## Dica socrática

Use a pergunta e, se ajudar, o nome do conceito. Na busca local, extraia `question` e `concept`, deixando `answer` fora do contexto. Dê uma única pista ou pergunta orientadora que preserve a tentativa do usuário, inclusive se o enunciado trouxer alternativas.

## Mnemônico

Use a pergunta e a resposta aprovada do cartão. Crie uma associação curta, como uma imagem mental, uma sigla ou uma frase, que preserve a distinção que o cartão testa. Entregue em uma ou duas frases. Se a resposta estiver ambígua, esclareça com o usuário antes de criar a associação.

Entregue o auxílio na conversa. A dica e o mnemônico são independentes da avaliação do cartão e do seu histórico de revisão.
