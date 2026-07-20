import {
  startSingleCardStudy,
  startDeckStudy,
  submitCardReview,
  finalizeStudySession,
  diagnoseConceptErrors,
  generateStudyAid,
  type ApiCardSchedule,
  type ApiDeckCard,
} from "@/lib/study-api";
import type {
  CardReviewInput,
  CardSchedule,
  ConceptErrorDiagnosis,
  DeckStudySession,
  SingleCardStudy,
  StudyAidMode,
  StudyCard,
  StudyPort,
} from "../../application/ports/study.port";

// Fatia de ESTUDO do adapter HTTP do grafo. Saiu do graph-http.adapter porque
// aquela classe implementa 10 ports num arquivo só e bateu no teto de 500 linhas
// do gate; sessão de estudo e diagnóstico são uma responsabilidade fechada.
// O HttpGraphAdapter herda daqui, então segue existindo um único ponto de entrada.
export class HttpGraphStudyAdapter implements StudyPort {
  async startSingleCardStudy(flashcardId: string): Promise<SingleCardStudy | null> {
    const res = await startSingleCardStudy(flashcardId);
    if (!res) return null;
    return {
      sessionId: res.sessionId,
      // O estudo de card único não ordena fila: não há peso a carregar.
      card: { ...res.card, schedule: toCardSchedule(res), importancia: null },
      due: res.due,
      proximaRevisao: res.proximaRevisao,
    };
  }

  async startDeckStudy(baralhoId: string): Promise<DeckStudySession | null> {
    const deck = await startDeckStudy(baralhoId);
    return deck && { ...deck, cards: deck.cards.map(toStudyCard) };
  }

  async submitCardReview(
    input: CardReviewInput,
  ): Promise<{ success: boolean; schedule: CardSchedule | null }> {
    const res = await submitCardReview(input);
    return { success: res.success, schedule: toCardSchedule(res.schedule) };
  }

  finalizeStudySession(sessionId: string): Promise<{ success: boolean }> {
    return finalizeStudySession(sessionId);
  }

  diagnoseConceptErrors(): Promise<ConceptErrorDiagnosis> {
    return diagnoseConceptErrors();
  }

  generateStudyAid(
    mode: StudyAidMode,
    card: { pergunta: string; resposta: string; conceito: string | null },
  ): Promise<{ texto: string }> {
    return generateStudyAid(mode, card);
  }
}

// A API serializa o agendamento plano, junto com o card; o domínio o quer como um
// objeto à parte (ou nulo, quando o card é novo). Traduzir é papel do adapter.
export function toCardSchedule(api: ApiCardSchedule | null): CardSchedule | null {
  if (!api || !api.proximaRevisao) return null;
  return {
    fase: api.fase as CardSchedule["fase"],
    learningStep: api.learningStep,
    dificuldade: api.dificuldade,
    intervalo: api.intervalo,
    fatorEase: api.fatorEase,
    proximaRevisao: api.proximaRevisao,
    ultimaRevisao: api.ultimaRevisao ?? api.proximaRevisao,
  };
}

function toStudyCard(api: ApiDeckCard): StudyCard {
  return {
    id: api.id,
    pergunta: api.pergunta,
    resposta: api.resposta,
    conceito: api.conceito,
    schedule: toCardSchedule(api),
    importancia: api.importancia,
  };
}
