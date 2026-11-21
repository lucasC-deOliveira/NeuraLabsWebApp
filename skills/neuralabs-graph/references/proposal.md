# Proposta de alteração do grafo

`baseRevision` vem do comando `inspect`. O rascunho referencia arquivos dentro do PARA por caminho relativo ao vault. Use IDs dos arquivos existentes. Para novos nós, gere um ID estável e único.

```json
{
  "version": 1,
  "graphId": "id-do-grafo",
  "baseRevision": "hash-de-64-caracteres-informado-pelo-inspect",
  "summary": "Adicionar uma nota de síntese a um conceito já estudado.",
  "sources": [
    { "path": "Resources/Bibliografia/Fichas/bib-manual-redacao-2018.md", "locator": "Seção 11.7" }
  ],
  "creates": [
    { "id": "id-novo", "type": "NOTA", "title": "Título", "body": "Uma ideia desenvolvida.", "noteRole": "PERMANENTE" }
  ],
  "reuses": ["id-conceito"],
  "edits": [],
  "relations": [
    { "from": "id-novo", "to": "id-conceito", "type": "SINTETIZA", "weight": 1, "reason": "A nota consolida as regras do conceito." }
  ]
}
```

- `creates` aceita `CONCEITO` e `NOTA`.
- `reuses` reaproveita o ID no próprio grafo ou vincula uma entidade compartilhada de outro grafo.
- `edits` aceita `id`, `title` e/ou `body` para uma nota ou conceito existente. Quando definido, `body` é a versão revisada completa, com o texto anterior que deve ser preservado e as fontes anteriores relevantes.
- `relations` acrescenta relações válidas na vista selecionada. O peso padrão é 1.

```text
node .neuralabs/tools/neuralabs-graph.cjs preview "." ".neuralabs/proposals/minha-proposta.json"
node .neuralabs/tools/neuralabs-graph.cjs apply "." ".neuralabs/proposals/minha-proposta.json" <confirmação-do-preview>
```
