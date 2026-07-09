import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractEditalSyllabus } from './extract-edital-syllabus';

// Real text extracted from the CEBRASPE/SERPRO 2023 edital PDF (109k chars).
const edital = readFileSync(join(__dirname, '__fixtures__/edital-serpro-2023.txt'), 'utf8');

describe('extractEditalSyllabus', () => {
  const syllabus = extractEditalSyllabus(edital);

  it('keeps the content program: disciplines and their numbered topics', () => {
    expect(syllabus).toMatch(/^CONHECIMENTOS\s+B[ÁA]SICOS/);
    expect(syllabus).toContain('LÍNGUA PORTUGUESA:');
    expect(syllabus).toContain('RACIOCÍNIO LÓGICO:');
    expect(syllabus).toContain('CONHECIMENTOS ESPECÍFICOS');
    expect(syllabus).toContain('ENGENHARIA DE SOFTWARE');
  });

  it('drops the grading rules before and the annex/schedule after', () => {
    expect(syllabus).not.toContain('folha de respostas');
    expect(syllabus).not.toContain('CRONOGRAMA');
    expect(syllabus).not.toContain('Superintendente');
  });

  it('shrinks the notice to a syllabus that fits the planner budget', () => {
    expect(syllabus.length).toBeGreaterThan(1000);
    expect(syllabus.length).toBeLessThan(15000);
    expect(syllabus.length).toBeLessThan(edital.length / 3);
  });

  it('returns empty when there is no content program', () => {
    expect(extractEditalSyllabus('edital sem programa de conteúdo')).toBe('');
  });
});
