import type { LearningStateRow } from '../ports/flashcard-analytics-source';
import type { MaturityMix } from '../analytics-views';

// Convenção Anki: intervalo >= 21 dias => carta "madura".
const MATURE_INTERVAL_DAYS = 21;

// Classifica cada carta: em aprendizado (LEARN/RELEARN), jovem (REVIEW < 21d) ou
// madura (REVIEW >= 21d).
export function maturityMix(states: LearningStateRow[]): MaturityMix {
  const mix: MaturityMix = { learning: 0, young: 0, mature: 0 };
  for (const state of states) {
    if (state.fase === 'LEARN' || state.fase === 'RELEARN') mix.learning++;
    else if (state.intervalo < MATURE_INTERVAL_DAYS) mix.young++;
    else mix.mature++;
  }
  return mix;
}
