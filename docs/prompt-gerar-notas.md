# Prompt — gerar notas (JSON) a partir de um texto

Cole este prompt no Claude web, substituindo `<COLE O SEU TEXTO AQUI>` pelo seu
texto de estudo. A resposta será um JSON pronto para a aba **"Via JSON"** do modal
"Adicionar nós ao grafo" (página `/graph`).

O JSON guarda o **texto original** (vira um nó *Texto bruto*) e as **notas geradas**
a partir dele — cada nota fica ligada ao texto por uma relação `gera`.

As regras abaixo espelham o app:

- Campos e enums: `src/components/graph/CreateNodeModal.tsx`
- Regras de relação (legenda do grafo): `src/modules/graph/domain/services/relation-rules.ts`

Se essas regras mudarem no código, atualize este prompt.

---

````text
Você é um assistente que transforma um texto de estudo em NOTAS no formato JSON
de um app de flashcards (estilo Zettelkasten + grafo de conhecimento).

Sua resposta deve ser APENAS um JSON válido (um único objeto), sem comentários,
sem markdown, sem texto antes ou depois. O JSON será colado diretamente no app.

## CONFIGURAÇÃO (marque com [x] o que você quer)
[ ] Guardar o texto bruto (texto original como fonte)
[ ] Gerar flashcards

Interprete as caixas acima:
- Se "Guardar o texto bruto" estiver marcada ([x]), inclua o campo "textoBruto";
  caso contrário ([ ]), OMITA totalmente o "textoBruto".
- Se "Gerar flashcards" estiver marcada ([x]), inclua o campo "flashcards" nas
  notas; caso contrário ([ ]), OMITA o "flashcards" de todas as notas.
Por padrão (nenhuma marcada) gere apenas as notas, sem texto bruto e sem flashcards.

## Formato geral
{
  "textoBruto": {            // inclua só se a caixa "Guardar o texto bruto" estiver marcada
    "titulo": string,        // um título curto para o texto original
    "texto": string          // o texto original na íntegra (texto puro)
  },
  "notas": [ ...notas... ]   // as notas geradas a partir do texto original
}
As notas serão automaticamente ligadas ao "textoBruto" por uma relação "gera".

## Schema de cada nota
{
  "titulo": string,        // obrigatório. Uma única ideia, afirmativo e específico
  "conteudo": string,      // obrigatório. Conteúdo da nota em MARKDOWN (#, **, listas, tabelas, código...)
  "tipoNota": string,      // "PERMANENTE" | "LITERATURA" | "ESTRUTURA" (padrão PERMANENTE)
  "subtipo": string,       // ver lista abaixo (obrigatório)
  "fonte": string | null,  // obrigatório SOMENTE quando tipoNota = "LITERATURA"; senão null
  "relacoes": [            // opcional: cria nós ligados à nota
    {
      "relacao": string,   // tipo da relação (ver regras abaixo)
      "peso": number,      // força da relação, de 0 a 2 (padrão 1.0)
      "alvo": {
        "tipoNode": string,        // "CONCEITO" | "TOPICO" | "ASSUNTO"
        "nome": string,
        "descricao": string | null,
        // HIERARQUIA OBRIGATÓRIA:
        "topico": {                // OBRIGATÓRIO quando tipoNode = "CONCEITO"
          "nome": string,
          "descricao": string | null,
          "assunto": { "nome": string, "descricao": string | null }
        },
        "assunto": {               // OBRIGATÓRIO quando tipoNode = "TOPICO"
          "nome": string,
          "descricao": string | null
        }
      }
    }
  ],
  "flashcards": [          // inclua só se a caixa "Gerar flashcards" estiver marcada; uma nota pode ter VÁRIOS
    {
      "pergunta": string,  // obrigatório, em MARKDOWN
      "resposta": string   // obrigatório, em MARKDOWN
    }
  ]
}

## Enums
- tipoNota:
  - "PERMANENTE" → uma ideia, com suas palavras, compreensível isoladamente
  - "LITERATURA" → anotação de leitura, próxima da fonte (exige "fonte")
  - "ESTRUTURA"  → índice/mapa que organiza tópicos e conceitos
- subtipo: "DEFINICAO" | "EXPLICACAO" | "EXEMPLO" | "COMPARACAO" |
           "SINTESE" | "PREREQUISITO" | "ERRO_COMUM" | "APLICACAO"

## Regras das relações de nota (RESPEITE EXATAMENTE — a nota é sempre a origem)
Uma nota só pode se ligar a nós do tipo CONCEITO, TOPICO ou ASSUNTO.
O "alvo.tipoNode" e o "relacao" devem obedecer a esta tabela:
- alvo.tipoNode = "CONCEITO" → relacao ∈ { "DEFINE", "EXPLICA", "APROFUNDA",
      "EXEMPLIFICA", "CONTRASTA", "SINTETIZA", "ALERTA_ERRO" }
- alvo.tipoNode = "TOPICO"   → relacao ∈ { "PERTENCE_A" }
- alvo.tipoNode = "ASSUNTO"  → relacao ∈ { "PERTENCE_A" }
Nunca use uma relação fora dessa tabela. Não invente outros tipoNode.
ATENÇÃO: "relacao" deve ser EXATAMENTE um dos valores listados acima (em maiúsculas).
NÃO existem relações genéricas como "RELACIONA", "RELACIONADO", "USA" ou "ASSOCIA" —
se nenhuma encaixar perfeitamente, use "EXPLICA" (relação fraca) ou "APROFUNDA".
"alvo.nome" é obrigatório; "alvo.descricao" pode ser null.
"peso" é a força da relação, um número de 0 a 2 (use ~1.0 para relações centrais/fortes,
valores menores como 0.5–0.7 para relações secundárias). Se omitido, o app usa 1.0.
NÃO crie manualmente a relação "gera" entre texto e nota — o app faz isso sozinho.

## Hierarquia obrigatória (conceito → tópico → assunto)
Todo conhecimento precisa estar ancorado na hierarquia. Por isso:
- Quando "alvo.tipoNode" = "CONCEITO", o alvo DEVE conter "topico", e esse tópico
  DEVE conter "assunto". (conceito pertence a um tópico, que pertence a um assunto)
- Quando "alvo.tipoNode" = "TOPICO", o alvo DEVE conter "assunto".
- Quando "alvo.tipoNode" = "ASSUNTO", não há pai.
O app cria sozinho as relações "pertence a" (conceito→tópico e tópico→assunto) —
você só precisa fornecer os nomes na estrutura aninhada. NÃO crie essas relações como
itens separados em "relacoes". Reaproveite os mesmos nomes de tópico/assunto entre
notas relacionadas para que elas compartilhem o mesmo nó (o app deduplica por nome).

## Flashcards (campo "flashcards" da nota)
Os flashcards ficam DENTRO da nota que eles testam. Cada flashcard pertence a
uma única nota, mas uma nota pode ter VÁRIOS flashcards (gere quantos forem úteis
para cobrir os pontos da nota). O app cria automaticamente, para cada flashcard:
- uma relação "testa" do flashcard para a nota;
- uma relação "herda" do flashcard para cada CONCEITO a que a nota se liga.
Você só precisa fornecer "pergunta" e "resposta" (em Markdown) — NÃO crie essas relações no JSON.
Escreva flashcards que cobrem a ideia principal da nota (pergunta direta e resposta curta).
Se a caixa "Gerar flashcards" não estiver marcada, omita o campo "flashcards" de todas as notas.

## Diretrizes de qualidade
- Respeite a CONFIGURAÇÃO: omita "textoBruto" e/ou "flashcards" quando a caixa não estiver marcada.
- "textoBruto.texto" deve conter o texto original recebido, sem resumir nem cortar.
- "conteudo" da nota e "pergunta"/"resposta" dos flashcards devem ser escritos em
  Markdown (use #, **negrito**, listas, tabelas e blocos de código quando ajudar).
- Quebre o texto em várias notas pequenas, uma ideia principal por nota.
- Escolha o subtipo que melhor descreve cada nota.
- Em "relacoes", conecte a nota aos conceitos centrais que ela define/explica
  (DEFINE para a definição principal; EXPLICA/APROFUNDA para conceitos relacionados;
  PERTENCE_A para o tópico/assunto ao qual a nota pertence).
- Use "LITERATURA" + "fonte" quando o texto for claramente de uma obra citada;
  caso contrário use "PERMANENTE".
- Saída final: SOMENTE o objeto JSON (com "textoBruto" e "flashcards" só quando as opções permitirem).

## Texto a transformar
"""
<COLE O SEU TEXTO AQUI>
"""
````
