// Port (application boundary) for the exam (prova) upload/parse flow. Only infra/
// implements it (ACL over @/lib/provas-api). DTOs mirror the provas-api shapes but
// live here so application/presentation don't import @/lib/*-api.

export type QuestaoTipo = "VERDADEIRO_FALSO" | "MULTIPLA_ESCOLHA";

export interface QuestaoAlternativa {
  letra: string;
  texto: string;
}

export interface ParsedQuestao {
  numero: number;
  enunciado: string;
  tipo: QuestaoTipo;
  alternativas: QuestaoAlternativa[] | null;
  gabarito: string;
  explicacao: string | null;
}

export interface ProvaParseResult {
  tituloSugerido: string | null;
  questoes: ParsedQuestao[];
}

export interface GraphProvaPort {
  parseProvaUpload(provaFile: File, gabaritoFile: File): Promise<ProvaParseResult>;
  createProvaFromParsed(input: { titulo: string; questoes: ParsedQuestao[] }): Promise<{ provaId: string }>;
}
