// Preferência de ordem da sessão, no localStorage — como as do flashcard (estilo,
// moldura). É do aparelho, não da conta: não vai ao backend.
import { DEFAULT_STUDY_ORDER, STUDY_ORDERS, type StudyOrder } from "./study-order";

const KEY = "neuralabs.study-order";

const isStudyOrder = (v: string | null): v is StudyOrder =>
  STUDY_ORDERS.some((o) => o.id === v);

/** Ordem escolhida, ou o padrão. Um valor estranho no disco vira o padrão. */
export function loadStudyOrder(): StudyOrder {
  try {
    const saved = localStorage.getItem(KEY);
    return isStudyOrder(saved) ? saved : DEFAULT_STUDY_ORDER;
  } catch {
    // localStorage pode falhar (modo privado): sem preferência, cai no padrão.
    return DEFAULT_STUDY_ORDER;
  }
}

export function saveStudyOrder(order: StudyOrder): void {
  try {
    localStorage.setItem(KEY, order);
  } catch {
    // sem onde guardar; a escolha vale só para esta sessão do app.
  }
}
