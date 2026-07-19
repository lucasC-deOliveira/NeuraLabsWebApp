// Port (application boundary) for the study-session flow over the HTTP edge.
// Only infra/ implements it (ACL over @/lib/study-api). No React, no @/lib here.

export type StudyGrade = "again" | "hard" | "good" | "easy";

// Agendamento SRS de um card. Mesma forma do LocalSchedule (@/lib/srs-local) —
// declarada aqui porque o port não importa @/lib. Vem do servidor para a sessão
// poder dizer, em cada botão, quanto tempo aquela nota daria neste card, e para
// saber QUANDO ele vence (antes ela o repetia na hora, ignorando o horário).
export interface CardSchedule {
  fase: "LEARN" | "REVIEW" | "RELEARN";
  learningStep: number;
  dificuldade: number;
  intervalo: number;
  fatorEase: number;
  proximaRevisao: string;
  ultimaRevisao: string;
}

export interface StudyCard {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string | null;
  // null = card novo, nunca revisado.
  schedule: CardSchedule | null;
  // Peso do conceito deste card no grafo (0..1), para a sessão poder mostrar
  // primeiro o que mais importa. null = card fora do grafo: desconhecido, não zero.
  importancia: number | null;
}

export interface SingleCardStudy {
  sessionId: string | null;
  card: StudyCard;
  due: boolean;
  proximaRevisao: string | null;
}

export interface DeckStudySession {
  sessionId: string;
  titulo: string;
  cards: StudyCard[];
  totalNoDeck: number;
}

export interface CardReviewInput {
  flashcardId: string;
  grade: StudyGrade;
  tempoResposta?: number;
  sessaoId?: string;
}

// Onde o usuário mais erra, por CONCEITO. `revisoesAnalisadas` acompanha a lista
// para a interface distinguir "você acerta tudo" de "você ainda não estudou" —
// sem isso as duas situações viram a mesma tela vazia.
export interface ConceptErrorRank {
  conceitoId: string;
  nome: string;
  revisoes: number;
  erros: number;
  taxaErro: number;
  score: number;
  // Os cards errados neste conceito — o que a sessão focada estuda.
  cardsComErro: string[];
}

export interface ConceptErrorDiagnosis {
  conceitos: ConceptErrorRank[];
  revisoesAnalisadas: number;
}

export interface StudyPort {
  diagnoseConceptErrors(): Promise<ConceptErrorDiagnosis>;
  startSingleCardStudy(flashcardId: string): Promise<SingleCardStudy | null>;
  startDeckStudy(baralhoId: string): Promise<DeckStudySession | null>;
  // Devolve o agendamento resultante: quem revisou precisa saber quando o card volta.
  submitCardReview(input: CardReviewInput): Promise<{ success: boolean; schedule: CardSchedule | null }>;
  finalizeStudySession(sessionId: string): Promise<{ success: boolean }>;
}
