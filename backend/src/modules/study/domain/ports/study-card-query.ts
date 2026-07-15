import { STARTING_EASE } from '../services/spaced-repetition';

// Read model for assembling a study session. Fields mirror the API response
// shown to the user (Portuguese), so it is a query projection, not an aggregate.
export interface StudyCardView {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string | null;
  fase: string;
  learningStep: number;
  // O agendamento atual do card. Vai junto para a interface poder dizer, em cada
  // botão, quanto tempo aquela nota daria NESTE card — antes ela chutava um texto
  // fixo ("Difícil ~ 10 min") que não batia com o algoritmo.
  // `proximaRevisao` nulo = card novo, nunca revisado (os demais são o estado
  // inicial do SM-2).
  intervalo: number;
  fatorEase: number;
  dificuldade: number;
  proximaRevisao: string | null;
  ultimaRevisao: string | null;
  // Peso do conceito deste card no grafo (0..1), para a sessão poder mostrar
  // primeiro o que mais importa. `null` = card sem conceito no grafo (a maioria
  // dos importados) — "não sei", que não é o mesmo que "vale zero".
  importancia: number | null;
}

// Estado do SM-2 para um card que nunca foi revisado — não existe registro de
// aprendizado para ele. `proximaRevisao` nula é o sinal de "card novo" para quem lê.
export const NEW_CARD_SCHEDULE = {
  fase: 'LEARN',
  learningStep: 0,
  intervalo: 0,
  fatorEase: STARTING_EASE,
  dificuldade: 5,
  proximaRevisao: null,
  ultimaRevisao: null,
} as const;

// A importância não vem do agendamento, e sim do grafo — quem monta a view a
// preenche à parte. Fica aqui para o default não ser esquecido em cada mapper.
export const NO_IMPORTANCE = { importancia: null } as const;

// Read port: cards eligible for a new session (due reviews + brand-new cards).
export interface StudyCardQuery {
  findDueCards(userId: string): Promise<StudyCardView[]>;
  findNewCards(userId: string, limit: number): Promise<StudyCardView[]>;
}

export const STUDY_CARD_QUERY = Symbol('STUDY_CARD_QUERY');
