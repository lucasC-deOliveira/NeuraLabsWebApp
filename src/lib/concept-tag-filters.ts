// Filtro por tags de conceito (assunto → tópico → conceito), compartilhado por quem
// exibe as tags do grafo: os cartões de um baralho e a lista de questões. Puro.
// Fica em @/lib porque um módulo não pode importar o domínio de outro — e as duas
// listas fazem exatamente a mesma pergunta às tags.

export interface ConceptTagLike {
  conceito: string;
  topico: string;
  topicoId: string;
  assunto: string;
  assuntoId: string;
}

export interface ConceptTagged {
  conceitosConectados: ConceptTagLike[];
}

// "" em qualquer campo = sem filtro naquele nível.
export interface ConceptTagFilter {
  assuntoId: string;
  topicoId: string;
  conceito: string;
}

/** Alguma tag casa com o texto buscado (já em minúsculas)? */
export function matchesTagText(tags: ConceptTagLike[], lowered: string): boolean {
  return tags.some(
    (t) =>
      t.conceito.toLowerCase().includes(lowered) ||
      t.topico.toLowerCase().includes(lowered) ||
      t.assunto.toLowerCase().includes(lowered),
  );
}

/**
 * O item casa com os três níveis? Um item pode estar ligado a vários conceitos:
 * basta que ALGUM deles atenda cada nível pedido.
 * @example matchesConceptTags(card, { assuntoId: "a1", topicoId: "", conceito: "" })
 */
export function matchesConceptTags(item: ConceptTagged, filter: ConceptTagFilter): boolean {
  const tags = item.conceitosConectados;
  return (
    (!filter.assuntoId || tags.some((t) => t.assuntoId === filter.assuntoId)) &&
    (!filter.topicoId || tags.some((t) => t.topicoId === filter.topicoId)) &&
    (!filter.conceito || tags.some((t) => t.conceito === filter.conceito))
  );
}

export interface AssuntoOption {
  id: string;
  nome: string;
}

export interface TopicoOption {
  id: string;
  nome: string;
  assuntoId: string;
}

export interface ConceptTagOptions {
  assuntos: AssuntoOption[];
  topicos: TopicoOption[];
  conceitos: string[];
}

const byNome = (a: { nome: string }, b: { nome: string }): number => a.nome.localeCompare(b.nome);

interface TagAccumulator {
  assuntos: Map<string, AssuntoOption>;
  topicos: Map<string, TopicoOption>;
  conceitos: Set<string>;
}

function collectTag(acc: TagAccumulator, tag: ConceptTagLike): void {
  if (tag.assuntoId) acc.assuntos.set(tag.assuntoId, { id: tag.assuntoId, nome: tag.assunto });
  if (tag.topicoId) {
    acc.topicos.set(tag.topicoId, { id: tag.topicoId, nome: tag.topico, assuntoId: tag.assuntoId });
  }
  if (tag.conceito) acc.conceitos.add(tag.conceito);
}

/**
 * Assuntos, tópicos e conceitos distintos presentes nas tags dos itens — os filtros
 * só oferecem o que existe na lista em questão.
 * @example conceptTagOptions(cards).assuntos // [{ id: "a1", nome: "Biologia" }]
 */
export function conceptTagOptions(items: ConceptTagged[]): ConceptTagOptions {
  const acc: TagAccumulator = { assuntos: new Map(), topicos: new Map(), conceitos: new Set() };
  for (const item of items) {
    for (const tag of item.conceitosConectados) collectTag(acc, tag);
  }
  return {
    assuntos: [...acc.assuntos.values()].sort(byNome),
    topicos: [...acc.topicos.values()].sort(byNome),
    conceitos: [...acc.conceitos].sort((a, b) => a.localeCompare(b)),
  };
}

/** Escolher um assunto restringe os tópicos oferecidos aos dele. */
export function topicosOfAssunto(options: ConceptTagOptions, assuntoId: string): TopicoOption[] {
  if (!assuntoId) return options.topicos;
  return options.topicos.filter((t) => t.assuntoId === assuntoId);
}
