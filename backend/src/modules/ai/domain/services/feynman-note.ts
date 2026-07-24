// Título e marcador da NOTA que materializa uma explicação Feynman no grafo.
//
// O marcador vai em `Nota.fonte` para tornar o salvar idempotente por alvo: re-salvar
// uma explicação atualiza a MESMA nota em vez de poluir o grafo com uma nota nova a
// cada tentativa. O histórico de tentativas (ExplicacaoFeynman) guarda cada versão.

const MAX_TITLE = 60;

// Ex.: feynmanNoteTitle('Recursão') === 'Explicação: Recursão'
export function feynmanNoteTitle(targetLabel: string): string {
  const clean = targetLabel.trim() || 'conceito';
  const short = clean.length > MAX_TITLE ? `${clean.slice(0, MAX_TITLE - 1)}…` : clean;
  return `Explicação: ${short}`;
}

// Ex.: feynmanNoteFonte('CONCEITO', 'c1') === 'feynman:CONCEITO:c1'
export function feynmanNoteFonte(alvoTipo: string, alvoId: string): string {
  return `feynman:${alvoTipo}:${alvoId}`;
}

export interface FeynmanNoteSection {
  titulo: string; // rótulo do ângulo (ex.: 'Simples', 'Analogia', 'Técnico')
  texto: string;
}

// Compõe o conteúdo da nota do grafo a partir das explicações por ângulo, uma seção
// por ângulo. Seções sem texto são omitidas. Uma seção só cai para o texto puro.
export function composeFeynmanNote(sections: FeynmanNoteSection[]): string {
  const filled = sections.filter((s) => s.texto.trim().length > 0);
  if (filled.length === 0) return '';
  if (filled.length === 1) return filled[0].texto.trim();
  return filled.map((s) => `## ${s.titulo}\n\n${s.texto.trim()}`).join('\n\n');
}
