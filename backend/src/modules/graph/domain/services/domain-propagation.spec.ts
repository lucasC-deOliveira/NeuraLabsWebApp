import { describe, it, expect } from 'vitest';
import {
  applyDomainFromFlashcards,
  computeMastery,
  type GraphEdge,
  type GraphNode,
} from './domain-propagation';

const node = (id: string, type: GraphNode['type']): GraphNode => ({
  id,
  label: id,
  type,
  nivelDominio: 0,
  prioridadeRevisao: 5,
});

describe('computeMastery', () => {
  const now = new Date('2026-06-22T12:00:00.000Z').getTime();

  it('equals the difficulty-based base when the card is not overdue', () => {
    // difficulty 0 → base 1; not overdue → decay 1.
    const m = computeMastery({ dificuldade: 0, intervalo: 10, proximaRevisao: new Date(now) }, now);
    expect(m).toBe(1);
  });

  it('higher difficulty lowers mastery', () => {
    const m = computeMastery({ dificuldade: 5, intervalo: 10, proximaRevisao: new Date(now) }, now);
    expect(m).toBeCloseTo(0.5, 5); // base = 1 - 5/10
  });

  it('decays as the card gets more overdue', () => {
    const overdue = new Date(now - 10 * 86_400_000); // 10 days overdue, interval 10 → decay e^-1
    const m = computeMastery({ dificuldade: 0, intervalo: 10, proximaRevisao: overdue }, now);
    expect(m).toBeCloseTo(Math.exp(-1), 5);
  });

  it('never goes below 0 (difficulty above 10 is clamped)', () => {
    const m = computeMastery(
      { dificuldade: 20, intervalo: 10, proximaRevisao: new Date(now) },
      now,
    );
    expect(m).toBe(0);
  });
});

describe('applyDomainFromFlashcards', () => {
  it('sets each flashcard node to its own mastery', () => {
    const nodes = [node('fc-1', 'FLASHCARD')];
    applyDomainFromFlashcards(nodes, [], new Map([['fc-1', 0.8]]));
    expect(nodes[0].nivelDominio).toBe(0.8);
  });

  it('propagates mastery across a domain-carrying edge to a concept', () => {
    const nodes = [node('fc-1', 'FLASHCARD'), node('c-1', 'CONCEITO')];
    const edges: GraphEdge[] = [{ source: 'fc-1', target: 'c-1', type: 'DEFINE', peso: 1 }];
    applyDomainFromFlashcards(nodes, edges, new Map([['fc-1', 0.6]]));
    expect(nodes[1].nivelDominio).toBeCloseTo(0.6, 5);
  });

  it('does not propagate across a non-domain-carrying relation', () => {
    const nodes = [node('fc-1', 'FLASHCARD'), node('c-1', 'CONCEITO')];
    const edges: GraphEdge[] = [{ source: 'fc-1', target: 'c-1', type: 'CONTRASTA_COM', peso: 1 }];
    applyDomainFromFlashcards(nodes, edges, new Map([['fc-1', 0.6]]));
    expect(nodes[1].nivelDominio).toBe(0);
  });

  it('averages contributions weighted by path strength (edge weight)', () => {
    const nodes = [node('fc-1', 'FLASHCARD'), node('fc-2', 'FLASHCARD'), node('c-1', 'CONCEITO')];
    const edges: GraphEdge[] = [
      { source: 'fc-1', target: 'c-1', type: 'DEFINE', peso: 1 },
      { source: 'fc-2', target: 'c-1', type: 'DEFINE', peso: 1 },
    ];
    applyDomainFromFlashcards(
      nodes,
      edges,
      new Map([
        ['fc-1', 1],
        ['fc-2', 0],
      ]),
    );
    expect(nodes[2].nivelDominio).toBeCloseTo(0.5, 5); // (1*1 + 0*1) / (1+1)
  });

  it('propagates across multiple hops, decaying strength by edge weight', () => {
    // fc(1.0) --DEFINE,peso0.5--> concept --PERTENCE_A,peso0.5--> topic
    const nodes = [node('fc-1', 'FLASHCARD'), node('c-1', 'CONCEITO'), node('t-1', 'TOPICO')];
    const edges: GraphEdge[] = [
      { source: 'fc-1', target: 'c-1', type: 'DEFINE', peso: 0.5 },
      { source: 'c-1', target: 't-1', type: 'PERTENCE_A', peso: 0.5 },
    ];
    applyDomainFromFlashcards(nodes, edges, new Map([['fc-1', 1]]));
    // single contributor → weighted average == the mastery value, regardless of strength
    expect(nodes[1].nivelDominio).toBeCloseTo(1, 5);
    expect(nodes[2].nivelDominio).toBeCloseTo(1, 5);
  });

  it('weights two contributors by their path strength (edge peso)', () => {
    // strong fc reaches the concept with peso 2, weak fc with peso 1.
    const nodes = [
      node('fc-strong', 'FLASHCARD'),
      node('fc-weak', 'FLASHCARD'),
      node('c-1', 'CONCEITO'),
    ];
    const edges: GraphEdge[] = [
      { source: 'fc-strong', target: 'c-1', type: 'DEFINE', peso: 2 },
      { source: 'fc-weak', target: 'c-1', type: 'DEFINE', peso: 1 },
    ];
    applyDomainFromFlashcards(
      nodes,
      edges,
      new Map([
        ['fc-strong', 1],
        ['fc-weak', 0],
      ]),
    );
    // (1*2 + 0*1) / (2 + 1) = 2/3
    expect(nodes[2].nivelDominio).toBeCloseTo(2 / 3, 5);
  });

  it('leaves non-target node types untouched', () => {
    const nodes = [node('fc-1', 'FLASHCARD'), node('b-1', 'BARALHO')];
    const edges: GraphEdge[] = [{ source: 'fc-1', target: 'b-1', type: 'CONTEM', peso: 1 }];
    applyDomainFromFlashcards(nodes, edges, new Map([['fc-1', 0.9]]));
    expect(nodes[1].nivelDominio).toBe(0);
  });
});
