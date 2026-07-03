// Port for the AI-assisted note extraction flow. The infra/ adapter implements
// it over @/lib/ai-api.

export interface NotaCandidata {
  titulo: string;
  conteudo: string;
  conceitosPrevistos: string[];
  conceitosDetalhe?: Array<{ nome: string }>;
}

export interface NotaAiPort {
  analyzeRawText(rawText: string): Promise<{ candidatas: NotaCandidata[] }>;
  saveSelectedNotas(
    candidatas: Array<{ titulo: string; conteudo: string }>,
  ): Promise<{ notaIds: string[] }>;
}
