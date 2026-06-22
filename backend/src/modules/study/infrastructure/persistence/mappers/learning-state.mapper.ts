import type { ScheduleState } from '../../../domain/services/spaced-repetition';

export interface AprendizadoColumns {
  dificuldade: number;
  intervalo: number;
  fatorEase: number;
  fase: string;
  learningStep: number;
  proximaRevisao: Date;
  ultimaRevisao: Date;
  estagioAprendizado: number;
}

// Maps domain scheduling state to AprendizadoFlashcard columns (includes the
// legacy estagioAprendizado field, derived from the phase).
export function toAprendizadoColumns(state: ScheduleState): AprendizadoColumns {
  return {
    dificuldade: state.dificuldade,
    intervalo: state.intervalo,
    fatorEase: state.fatorEase,
    fase: state.fase,
    learningStep: state.learningStep,
    proximaRevisao: state.proximaRevisao,
    ultimaRevisao: state.ultimaRevisao,
    estagioAprendizado: state.fase === 'REVIEW' ? 5 : 0,
  };
}
