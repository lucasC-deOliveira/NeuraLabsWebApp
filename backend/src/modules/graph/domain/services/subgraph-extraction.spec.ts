import { describe, it, expect } from 'vitest';
import { centroid, externalEdges, rewireEndpoints, type ExtractEdge } from './subgraph-extraction';

describe('centroid', () => {
  it('averages the points', () => {
    expect(
      centroid([
        { x: 0, y: 0 },
        { x: 4, y: 2 },
      ]),
    ).toEqual({ x: 2, y: 1 });
  });

  it('defaults to the origin for no points', () => {
    expect(centroid([])).toEqual({ x: 0, y: 0 });
  });
});

const edge = (id: string, o: string | null, d: string | null): ExtractEdge => ({
  id,
  nodeOrigemId: o,
  nodeDestinoId: d,
});

describe('externalEdges', () => {
  it('keeps only edges with at least one endpoint outside the set', () => {
    const inner = new Set(['a', 'b']);
    const edges = [edge('inner', 'a', 'b'), edge('out', 'a', 'z'), edge('dangling', 'b', null)];
    expect(externalEdges(edges, inner).map((e) => e.id)).toEqual(['out', 'dangling']);
  });
});

describe('rewireEndpoints', () => {
  it('redirects the inside endpoint to the ref node, keeping the outside one', () => {
    const inner = new Set(['a']);
    expect(rewireEndpoints(edge('e', 'a', 'z'), inner, 'ref')).toEqual({
      nodeOrigemId: 'ref',
      nodeDestinoId: 'z',
    });
  });

  it('redirects the destino endpoint when it is the inside one', () => {
    const inner = new Set(['b']);
    expect(rewireEndpoints(edge('e', 'z', 'b'), inner, 'ref')).toEqual({
      nodeOrigemId: 'z',
      nodeDestinoId: 'ref',
    });
  });
});
