import type { GraphListQuery, GraphSortField, GraphTypeFilter } from '../ports/graph-query';

// Tamanho de página padrão e teto (evita `pageSize` abusivo vindo do cliente).
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

const SORTS: GraphSortField[] = ['recentes', 'atualizados', 'alfabetica', 'subgrafos'];
const TIPOS: GraphTypeFilter[] = ['todos', 'raiz', 'subgrafo'];

// Query crua vinda da borda HTTP (tudo string/undefined).
export interface RawGraphListQuery {
  q?: string;
  tipo?: string;
  sort?: string;
  createdFrom?: string;
  createdTo?: string;
  assunto?: string; // ids de assunto separados por vírgula
  page?: string;
  pageSize?: string;
}

function oneOf<T extends string>(
  value: string | undefined,
  allowed: T[],
  fallback: T,
  label: string,
): T {
  if (value === undefined || value === '') return fallback;
  if ((allowed as string[]).includes(value)) return value as T;
  throw new Error(`invalid ${label}: "${value}". Expected: ${allowed.join('|')}`);
}

function positiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new Error(`invalid integer: "${value}". Expected: >= 1`);
  return n;
}

function optionalDate(value: string | undefined, label: string): Date | undefined {
  if (value === undefined || value === '') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new Error(`invalid ${label}: "${value}". Expected: ISO date`);
  return date;
}

function trimmed(value: string | undefined): string | undefined {
  const t = value?.trim();
  return t ? t : undefined;
}

function idList(value: string | undefined): string[] | undefined {
  const ids = value
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids && ids.length ? ids : undefined;
}

/**
 * Valida/normaliza a query crua da listagem de grafos numa query tipada e limitada
 * (defaults aplicados, `pageSize` limitado a MAX_PAGE_SIZE). Lança em enum/data inválidos.
 * @example parseGraphListQuery({ tipo: 'raiz', sort: 'recentes', page: '2' })
 */
export function parseGraphListQuery(raw: RawGraphListQuery): GraphListQuery {
  return {
    q: trimmed(raw.q),
    tipo: oneOf(raw.tipo, TIPOS, 'todos', 'tipo'),
    sort: oneOf(raw.sort, SORTS, 'recentes', 'sort'),
    createdFrom: optionalDate(raw.createdFrom, 'createdFrom'),
    createdTo: optionalDate(raw.createdTo, 'createdTo'),
    assuntoIds: idList(raw.assunto),
    page: positiveInt(raw.page, 1),
    pageSize: Math.min(positiveInt(raw.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE),
  };
}
