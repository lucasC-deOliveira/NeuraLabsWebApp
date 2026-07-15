// Modelo de prova (domain). Uma prova é composta de questões — reutiliza os
// value-types do bounded context `questions` (composição documentada, ver
// .dependency-cruiser.cjs / provas-so-consome-questions).
import type { AlternativaMultipla, TipoQuestao } from "@/modules/questions/domain/questao.types";

export interface ProvaListItem {
  id: string;
  titulo: string;
  descricao: string | null;
  totalQuestoes: number;
  dataCriacao: string;
}

// Tag de um conceito que a questão testa no grafo, com tópico e assunto pais.
export interface ProvaConceptTag {
  conceito: string;
  topico: string;
  topicoId: string;
  assunto: string;
  assuntoId: string;
}

export interface ProvaQuestaoItem {
  ordem: number;
  id: string;
  tipo: TipoQuestao;
  enunciado: string;
  alternativas: AlternativaMultipla[] | null;
  gabarito: string;
  explicacao: string | null;
  conceitoNome: string | null;
  // A taxonomia da questão vem do grafo (arestas QUESTION → CONCEITO), não da FK
  // conceitoNome — é o que alimenta os filtros da prova aberta.
  conceitosConectados: ProvaConceptTag[];
}

export interface ProvaDetail {
  id: string;
  titulo: string;
  descricao: string | null;
  dataCriacao: string;
  questoes: ProvaQuestaoItem[];
}

export interface CreateProvaInput {
  titulo: string;
  descricao?: string;
  questaoIds: string[];
}

export interface ParsedQuestaoPreview {
  numero: number;
  enunciado: string;
  tipo: TipoQuestao;
  alternativas: AlternativaMultipla[] | null;
  gabarito: string;
  explicacao: string | null;
}

export interface ParseUploadResult {
  tituloSugerido: string | null;
  questoes: ParsedQuestaoPreview[];
}

export interface CreateFromParsedInput {
  titulo: string;
  descricao?: string;
  questoes: ParsedQuestaoPreview[];
}
