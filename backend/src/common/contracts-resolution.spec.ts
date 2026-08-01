import { describe, it, expect } from 'vitest';
import { createBaralhoContract, BARALHO_TITULO_MAX } from '../../../contracts/baralhos';

// Guarda de fiação: o contrato compartilhado mora fora de backend/ e chega aqui por
// import RELATIVO (o tsc não reescreve path alias no JS emitido). Se alguém mexer no
// rootDir/include do tsconfig e quebrar isso, este spec falha antes do runtime.
describe('resolução do contrato compartilhado', () => {
  it('importa o schema de baralho de fora do backend', () => {
    expect(BARALHO_TITULO_MAX).toBe(120);
    expect(createBaralhoContract.safeParse({ titulo: 'Bio' }).success).toBe(true);
  });

  it('aplica o teto de título que o domínio do backend também cobra', () => {
    const parsed = createBaralhoContract.safeParse({ titulo: 'x'.repeat(BARALHO_TITULO_MAX + 1) });
    expect(parsed.success).toBe(false);
  });
});
