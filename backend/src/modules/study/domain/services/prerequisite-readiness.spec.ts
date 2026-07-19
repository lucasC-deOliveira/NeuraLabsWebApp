import { describe, it, expect } from 'vitest';
import {
  cardReadiness,
  orderByReadiness,
  READY,
  type ConceptPrerequisites,
  type ReadinessCard,
} from './prerequisite-readiness';

const card = (id: string, conceito: string | null): ReadinessCard => ({ id, conceito });

// "Dijkstra depende de Grafos (0.2) e de Filas (0.9)".
const prereqs = (
  map: Record<string, Array<{ nome: string; dominio: number }>>,
): ConceptPrerequisites => new Map(Object.entries(map));

describe('cardReadiness', () => {
  it('reports a card whose prerequisites are all mastered as ready', () => {
    const readiness = cardReadiness(
      card('c1', 'Dijkstra'),
      prereqs({ Dijkstra: [{ nome: 'Grafos', dominio: 0.9 }] }),
    );

    expect(readiness.score).toBeCloseTo(0.9);
    expect(readiness.blockedBy).toBeNull();
  });

  // O elo mais fraco manda: saber 90% de um pré-requisito não compensa saber 20%
  // do outro — estudar assim é frustrante, que é o que o tutor evita.
  it('is limited by the weakest prerequisite, not the average', () => {
    const readiness = cardReadiness(
      card('c1', 'Dijkstra'),
      prereqs({
        Dijkstra: [
          { nome: 'Grafos', dominio: 0.2 },
          { nome: 'Filas', dominio: 0.9 },
        ],
      }),
    );

    expect(readiness.score).toBeCloseTo(0.2);
    expect(readiness.blockedBy).toBe('Grafos');
  });

  it('treats a concept with no prerequisites as ready', () => {
    const readiness = cardReadiness(card('c1', 'Grafos'), prereqs({}));

    expect(readiness.score).toBe(READY);
    expect(readiness.blockedBy).toBeNull();
  });

  // A maioria dos cards importados não tem conceito: "não sei" não é "não pronto",
  // e rebaixá-los esconderia o acervo inteiro atrás do que foi classificado.
  it('treats a card with no concept as ready, not as blocked', () => {
    expect(cardReadiness(card('c1', null), prereqs({})).score).toBe(READY);
  });
});

describe('orderByReadiness', () => {
  it('puts ready cards before the ones blocked by a weak prerequisite', () => {
    const cards = [card('bloqueado', 'Dijkstra'), card('pronto', 'Grafos')];
    const map = prereqs({ Dijkstra: [{ nome: 'Grafos', dominio: 0.1 }] });

    expect(orderByReadiness(cards, map).map((c) => c.id)).toEqual(['pronto', 'bloqueado']);
  });

  // Reordenar é sugerir; remover seria decidir pelo usuário. Todo card continua na fila.
  it('never drops a card, only reorders', () => {
    const cards = [card('a', 'Dijkstra'), card('b', 'Grafos'), card('c', null)];
    const map = prereqs({ Dijkstra: [{ nome: 'Grafos', dominio: 0 }] });

    expect(orderByReadiness(cards, map)).toHaveLength(3);
  });

  it('keeps the original order among equally ready cards', () => {
    const cards = [card('a', null), card('b', null), card('c', null)];

    expect(orderByReadiness(cards, prereqs({})).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });
});
