import { describe, it, expect } from 'vitest';
import {
  selectCompletenessAssessments,
  MAX_ASSESSMENT_ITEMS,
  type AssessmentSubject,
} from './completeness-assessment';

const assuntos: AssessmentSubject[] = [
  { id: 'a1', nome: 'Biologia' },
  { id: 'a2', nome: 'Química' },
];

describe('selectCompletenessAssessments', () => {
  it('resolves the subject and clamps the score', () => {
    const out = selectCompletenessAssessments(
      [{ assuntoNome: 'biologia', score: 99, wellCovered: ['x'], shallow: [], missing: ['y'] }],
      assuntos,
    );
    expect(out).toEqual([
      {
        assuntoId: 'a1',
        assuntoNome: 'Biologia',
        score: 10,
        wellCovered: ['x'],
        shallow: [],
        missing: ['y'],
      },
    ]);
  });

  it('defaults a non-numeric score to 5 and rounds', () => {
    expect(selectCompletenessAssessments([{ assuntoNome: 'Biologia' }], assuntos)[0]?.score).toBe(
      5,
    );
    expect(
      selectCompletenessAssessments([{ assuntoNome: 'Biologia', score: 6.7 }], assuntos)[0]?.score,
    ).toBe(7);
  });

  it('resolves by id and by partial name', () => {
    expect(selectCompletenessAssessments([{ assuntoId: 'a2' }], assuntos)[0]?.assuntoId).toBe('a2');
    expect(
      selectCompletenessAssessments([{ assuntoNome: 'curso de Biologia' }], assuntos)[0]?.assuntoId,
    ).toBe('a1');
  });

  it('drops unresolved subjects and caps each list', () => {
    const big = Array.from({ length: MAX_ASSESSMENT_ITEMS + 4 }, (_, i) => `i${i}`);
    const out = selectCompletenessAssessments(
      [{ assuntoNome: 'inexistente zzz' }, { assuntoNome: 'Química', missing: big }],
      assuntos,
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.missing).toHaveLength(MAX_ASSESSMENT_ITEMS);
  });

  it('ignores non-string list items', () => {
    const out = selectCompletenessAssessments(
      [{ assuntoNome: 'Biologia', wellCovered: ['ok', 1, null, 'two'] }],
      assuntos,
    );
    expect(out[0]?.wellCovered).toEqual(['ok', 'two']);
  });
});
