# Prompt — importar um grafo (JSON) a partir de um texto

Cole este prompt no Claude web, substituindo `<COLE O SEU TEXTO AQUI>` pelo seu
texto de estudo. A resposta é um JSON pronto para o botão **"Importar JSON"** da
barra de ferramentas do grafo (página `/graph`).

O formato é genérico: uma lista de **nós** (qualquer tipo) e uma lista de
**arestas** (relações entre eles), validadas pelas regras da legenda.

As regras abaixo espelham o app:

- Tipos de nó e validação: `src/actions/graph.ts` (importGraph) e `src/components/graph/ImportJsonModal.tsx`
- Regras de relação (legenda): `src/modules/graph/domain/services/relation-rules.ts`

Se essas regras mudarem no código, atualize este prompt.

---

````text
Você transforma um texto de estudo em um GRAFO DE CONHECIMENTO no formato JSON
de um app de flashcards (Zettelkasten + grafo).

Sua resposta deve ser APENAS um JSON válido (um único objeto), sem comentários,
sem markdown ao redor, sem texto antes ou depois. Será colado direto no app.

## CONFIGURAÇÃO (marque com [x] os tipos de nó que devem ser gerados)
[ ] ASSUNTO
[ ] TOPICO
[ ] CONCEITO
[ ] NOTA
[ ] FLASHCARD
[ ] TEXTO_BRUTO
[ ] BARALHO

Regras da configuração:
- Gere APENAS nós dos tipos marcados ([x]). Omita totalmente os tipos não marcados.
- Crie uma aresta SOMENTE quando AMBOS os tipos das pontas estiverem marcados.
- Dependências úteis (marque junto quando quiser o efeito):
  - NOTA liga-se a CONCEITO/TOPICO/ASSUNTO — marque-os para ancorar as notas.
  - FLASHCARD testa uma NOTA e herda um CONCEITO — marque NOTA e CONCEITO junto.
  - BARALHO contém FLASHCARD — marque FLASHCARD junto.
  - TEXTO_BRUTO gera NOTA — marque NOTA junto.
- Se nada estiver marcado, gere apenas NOTA + CONCEITO + TOPICO + ASSUNTO (padrão).

## Formato geral
{
  "nodes": [ ... ],   // os nós do grafo (qualquer tipo)
  "edges": [ ... ]    // as relações entre os nós
}

## Nós (cada nó tem "ref" único e "tipo")
Use "ref" como um id local (ex.: "a1", "c2") para referenciar o nó nas arestas.
Campos por tipo:
- ASSUNTO     : { "ref", "tipo":"ASSUNTO",  "nome", "descricao"?:string|null }
- TOPICO      : { "ref", "tipo":"TOPICO",   "nome", "descricao"?:string|null }
- CONCEITO    : { "ref", "tipo":"CONCEITO", "nome", "descricao"?:string|null }
- FLASHCARD   : { "ref", "tipo":"FLASHCARD","pergunta", "resposta" }   // em Markdown
- NOTA        : { "ref", "tipo":"NOTA", "titulo", "conteudo",          // conteudo em Markdown
                  "tipoNota":"PERMANENTE|LITERATURA|ESTRUTURA",
                  "subtipo":"DEFINICAO|EXPLICACAO|EXEMPLO|COMPARACAO|SINTESE|PREREQUISITO|ERRO_COMUM|APLICACAO",
                  "fonte":string|null }   // fonte obrigatória se tipoNota = LITERATURA
- TEXTO_BRUTO : { "ref", "tipo":"TEXTO_BRUTO", "titulo", "texto" }     // o texto original, na íntegra
- BARALHO     : { "ref", "tipo":"BARALHO", "titulo" }                  // coleção de flashcards

## Arestas (relações) — { "origem":ref, "destino":ref, "relacao", "peso"?:0..2 }
A "relacao" deve ser EXATAMENTE um valor permitido para o par (origem→destino).
NÃO invente relações. Tabela permitida (origem → destino : relações):
- TEXTO_BRUTO → NOTA     : GERA
- NOTA → CONCEITO        : DEFINE, EXPLICA, APROFUNDA, EXEMPLIFICA, CONTRASTA, SINTETIZA, ALERTA_ERRO
- NOTA → TOPICO          : PERTENCE_A
- NOTA → ASSUNTO         : PERTENCE_A
- CONCEITO → CONCEITO    : IS_A, PART_OF, PREREQUISITO, DERIVA_DE, EVOLUI_PARA, REFORCA, ALTERNATIVA_A, CONTRASTA_COM, CONFUNDE_COM, ANTI_PADRAO_DE, MEDIDO_POR, OBJETIVO_DE
- CONCEITO → TOPICO      : PERTENCE_A, FUNDAMENTA, APLICADO_EM
- TOPICO → TOPICO        : SUBTOPICO_DE, RELACIONADO, DEPENDE_DE, EVOLUI_PARA
- TOPICO → ASSUNTO       : PERTENCE_A, APLICADO_EM
- FLASHCARD → NOTA       : TESTA
- FLASHCARD → CONCEITO   : HERDA
- BARALHO → FLASHCARD    : CONTEM
O par é simétrico (a ordem dos tipos não importa para a regra), mas escreva a
aresta no sentido natural acima. "peso" é a força (0 a 2, padrão 1.0).
Se nenhuma relação da tabela encaixar para um par, NÃO crie a aresta.

## ERROS COMUNS — NÃO cometa
- NOTA SEMPRE tem "titulo" (string). NÃO coloque o título só dentro do "conteudo".
- BARALHO usa "titulo" (NÃO "nome").
- ASSUNTO/TOPICO/CONCEITO usam "nome"; NOTA/TEXTO_BRUTO/BARALHO usam "titulo".
- Use SOMENTE relações da tabela acima, no par exato:
  - TOPICO → TOPICO aceita apenas: SUBTOPICO_DE, RELACIONADO, DEPENDE_DE, EVOLUI_PARA.
    NÃO use FUNDAMENTA aqui (FUNDAMENTA é só CONCEITO → TOPICO).
  - PERTENCE_A liga CONCEITO/TOPICO/NOTA a seu pai (tópico/assunto), não tópico↔tópico.
- Todo "origem"/"destino" deve ser um "ref" existente em "nodes".

## Hierarquia recomendada
Ancore o conhecimento: todo CONCEITO deve PERTENCE_A um TOPICO, e todo TOPICO deve
PERTENCE_A um ASSUNTO. Reaproveite o mesmo "ref" (não duplique nós com o mesmo nome).

## Diretrizes de qualidade
- Respeite a CONFIGURAÇÃO: gere só os tipos marcados.
- Quebre o texto em várias NOTAS pequenas (uma ideia por nota), ligadas aos
  conceitos que definem/explicam.
- "conteudo" das notas e "pergunta"/"resposta" dos flashcards em Markdown.
- Quando CONCEITO/TOPICO/ASSUNTO estiverem marcados, estruture a hierarquia
  (NOTA→CONCEITO, CONCEITO→TOPICO, TOPICO→ASSUNTO).
- TEXTO_BRUTO (quando marcado) recebe o texto original na íntegra e liga-se às
  notas com GERA.
- FLASHCARD (quando marcado) TESTA uma nota e HERDA o conceito dela; BARALHO
  (quando marcado) CONTEM os flashcards.
- Saída final: SOMENTE o objeto JSON { "nodes": [...], "edges": [...] }.

## Texto a transformar
"""
<COLE O SEU TEXTO AQUI>
"""
````
