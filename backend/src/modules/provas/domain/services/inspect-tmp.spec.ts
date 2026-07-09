import { describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractJudgmentItems } from './extract-judgment-items';
import { cleanExamText } from './exam-text-cleaning';

// Temporary inspection helper (not committed): prints real extraction samples.
describe('inspect', () => {
  it('prints samples', () => {
    const raw = readFileSync(join(__dirname, '__fixtures__/cebraspe-8pages.txt'), 'utf8');
    const qs = extractJudgmentItems(cleanExamText(raw));
    const have = new Set(qs.map((q) => q.numero));
    const missing: number[] = [];
    for (let i = 1; i <= 120; i++) if (!have.has(i)) missing.push(i);
    console.log('TOTAL:', qs.length, 'faltando:', JSON.stringify(missing));
    for (const n of [1, 6, 19, 31, 33, 38, 92, 120]) {
      const q = qs.find((x) => x.numero === n);
      console.log(`\n===== ITEM ${n} =====\n${q ? q.enunciado.slice(0, 600) : '(ausente)'}`);
    }
  });
});
