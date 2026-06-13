// Geração de flashcards a partir de uma nota (regras + IA).
// Helpers de parsing puros, sem dependência de Prisma/graph.

export type FlashcardSourceType =
  | 'pergunta_resposta'
  | 'cloze'
  | 'bidirecional'
  | 'explicacao_profunda'
  | 'comparacao'
  | 'lista_fragmentada'
  | 'aplicacao_problema'
  | 'identificacao_imagem'
  | 'erro_comum'
  | 'definicao'
  | 'finalidade'
  | 'importancia'
  | 'caracteristicas'
  | 'diferenca'
  | 'conteudo';

export interface FlashcardPreview {
  id: string;
  pergunta: string;
  resposta: string;
  conceitoId: string;
  conceptNome?: string;
  source: FlashcardSourceType;
}

const DEFINITION_PATTERN = /^([A-ZÀ-ÚÇ][a-zÀ-úÇ, ]{2,40}):\s(.+)$/;

export function parseNoteSections(rawText: string) {
  const lines = rawText.split('\n');
  const sections: Array<{ heading: string; content: string[]; definitions: Array<{ term: string; explanation: string }> }> = [];
  let current: (typeof sections)[number] | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('#') || (line === line.toUpperCase() && line.length > 3 && /^[A-Z0-9À-ÚÇ ]+$/.test(line))) {
      if (current) sections.push(current);
      current = { heading: line.replace(/^#+\s*/, ''), content: [], definitions: [] };
      continue;
    }
    if (!line) continue;
    if (!current) current = { heading: 'Nota', content: [], definitions: [] };

    const defMatch = line.match(DEFINITION_PATTERN);
    if (defMatch) {
      current.definitions.push({ term: defMatch[1], explanation: defMatch[2] });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      current.content.push(line.slice(2));
    } else {
      current.content.push(line);
    }
  }
  if (current) sections.push(current);
  if (sections.length === 0) {
    return [{ heading: 'Nota', content: lines.filter((l) => l.trim().length > 0), definitions: [] }];
  }
  return sections;
}

// Resolve conceito por nome (com fallback para o primeiro disponível).
export function makeConceptResolver(allConcepts: Array<{ id: string; nome: string }>) {
  const findConcept = (searchFor: string): { id: string; nome: string } | null => {
    if (!searchFor) return null;
    const lower = searchFor.toLowerCase();
    const match = allConcepts.find((c) => c.nome.toLowerCase().includes(lower) || lower.includes(c.nome.toLowerCase()));
    return match ? { id: match.id, nome: match.nome } : null;
  };
  const resolveFallback = (conceptTerm: string): { id: string; nome: string } | null => {
    let target = findConcept(conceptTerm);
    if (!target && allConcepts.length > 0) target = { id: allConcepts[0].id, nome: allConcepts[0].nome };
    return target;
  };
  return { findConcept, resolveFallback };
}

function createClozeCard(content: string): { pergunta: string; resposta: string } {
  const firstLine = content.split('\n')[0] || content;
  const words = firstLine.split(/\s+/).filter((w) => w.length > 3);
  const keyWord = words[Math.floor(words.length / 2)] || '___';
  const clozed = firstLine.replace(new RegExp(`\\b${keyWord}\\b`, 'i'), '{{...}}');
  return { pergunta: `Complete: ${clozed}`, resposta: keyWord };
}

// Preview baseado em regras (sem IA).
export function buildRulePreview(conteudo: string, allConcepts: Array<{ id: string; nome: string }>): FlashcardPreview[] {
  const { resolveFallback } = makeConceptResolver(allConcepts);
  const sections = parseNoteSections(conteudo);
  const preview: FlashcardPreview[] = [];

  for (const section of sections) {
    for (const def of section.definitions) {
      const target = resolveFallback(def.term);
      if (!target) continue;
      preview.push({
        id: randomId(),
        pergunta: `O que é/define "${def.term}"?`,
        resposta: def.explanation,
        conceitoId: target.id,
        conceptNome: target.nome,
        source: 'pergunta_resposta',
      });
    }
  }

  const hasDefCards = sections.some((s) => s.definitions.length > 0);
  for (const section of sections) {
    if (section.content.length === 0) continue;
    const target = resolveFallback(section.heading);
    if (!target || section.heading === 'Nota') continue;

    const content = section.content.join('\n');
    const wordCount = content.split(/\s+/).length;
    const typeCount = Math.min(4, Math.max(1, Math.ceil(wordCount / 50)));

    const templates = [
      { pergunta: `O que é ${section.heading}?`, resposta: content.slice(0, 500), source: 'pergunta_resposta' as const },
      { resposta: content.slice(0, 500), source: 'cloze' as const },
      { pergunta: `O que é o oposto de ${section.heading}?`, resposta: content.slice(0, 400), source: 'bidirecional' as const },
      { pergunta: `Explique detalhadamente: ${section.heading}`, resposta: content.slice(0, 600), source: 'explicacao_profunda' as const },
      { pergunta: `Diferença entre ${section.heading} e conceitos similares`, resposta: content.slice(0, 400), source: 'comparacao' as const },
      { pergunta: `Cite os pontos principais sobre ${section.heading}`, resposta: content.split('\n').slice(0, 3).join('\n').slice(0, 300), source: 'lista_fragmentada' as const },
      { pergunta: `O que acontece se ignorarmos ${section.heading}?`, resposta: content.slice(0, 400), source: 'aplicacao_problema' as const },
      { pergunta: `Qual o erro mais comum sobre ${section.heading}?`, resposta: content.slice(0, 400), source: 'erro_comum' as const },
    ];

    const startIndex = hasDefCards ? 1 : 0;
    for (let i = startIndex; i < startIndex + typeCount && i < templates.length; i++) {
      const tpl = templates[i];
      const clozed = createClozeCard(content);
      preview.push({
        id: randomId(),
        pergunta: tpl.pergunta || clozed.pergunta,
        resposta: tpl.resposta || clozed.resposta,
        conceitoId: target.id,
        conceptNome: target.nome,
        source: tpl.source,
      });
    }
  }
  return preview;
}

function randomId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
}
