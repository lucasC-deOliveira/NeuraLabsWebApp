// Paginação client-side de uma lista já filtrada/ordenada. A página é clampada ao
// intervalo válido para que exclusões ou mudança de filtro não deixem o usuário numa
// página inexistente (ex.: estava na 3, filtrou e sobrou 1 página).

export interface PageResult<T> {
  items: T[];
  page: number; // página efetiva (já clampada a [1, totalPages])
  totalPages: number;
}

/**
 * Fatia `items` na página pedida (1-based). Lista vazia → 1 página vazia.
 * @example paginate([a, b, c], 1, 2) // { items: [a, b], page: 1, totalPages: 2 }
 */
export function paginate<T>(items: T[], page: number, pageSize: number): PageResult<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: safePage, totalPages };
}
