import { describe, it, expect } from 'vitest';
import { buildAssessmentContext, type AssessmentContextData } from './assessment-context';

// Graph: assunto "Bio" (nc na) ← topico "Cel" (nc nt, PERTENCE_A) ;
// concept "Orphan" not linked to any subject.
const data: AssessmentContextData = {
  assuntos: [{ id: 'a', nome: 'Bio' }],
  topicos: [{ id: 't', nome: 'Cel' }],
  conceitos: [{ id: 'c', nome: 'Orphan' }],
  ncNodes: [
    { id: 'na', tipoNode: 'ASSUNTO', referenciaId: 'a' },
    { id: 'nt', tipoNode: 'TOPICO', referenciaId: 't' },
    { id: 'nc', tipoNode: 'CONCEITO', referenciaId: 'c' },
  ],
  pertenceEdges: [{ nodeOrigemId: 'nt', nodeDestinoId: 'na' }],
};

describe('buildAssessmentContext', () => {
  it('groups linked children under their subject and lists orphans', () => {
    expect(buildAssessmentContext(data)).toBe(
      ['ASSUNTO: "Bio"', '  Tópicos: Cel', 'Outros (sem assunto pai):', '  Conceitos: Orphan'].join(
        '\n',
      ),
    );
  });

  it('lists a subject without children and no orphans section when all are linked', () => {
    const ctx = buildAssessmentContext({
      assuntos: [{ id: 'a', nome: 'Bio' }],
      topicos: [],
      conceitos: [],
      ncNodes: [{ id: 'na', tipoNode: 'ASSUNTO', referenciaId: 'a' }],
      pertenceEdges: [],
    });
    expect(ctx).toBe('ASSUNTO: "Bio"');
  });

  it('ignores edges with a missing endpoint or a non-subject destination', () => {
    const ctx = buildAssessmentContext({
      ...data,
      pertenceEdges: [
        { nodeOrigemId: null, nodeDestinoId: 'na' },
        { nodeOrigemId: 'nt', nodeDestinoId: 'nt' },
      ],
    });
    // the topic is no longer linked to the subject → becomes an orphan
    expect(ctx).toContain('Outros (sem assunto pai):');
    expect(ctx).toContain('Cel');
  });
});
