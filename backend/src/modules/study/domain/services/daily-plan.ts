// Alvo do dia de um plano de estudo. Puro: dado o backlog (revisões de card +
// re-explicações Feynman vencidas), quantos conceitos novos ainda cabem hoje.
//
// As revisões são a ESPINHA — sempre entram (esquecer custa caro). Os novos preenchem
// o que sobra da meta. Se a espinha já estoura o tempo, hoje é dia de só revisar.

export type MetaTipo = 'TEMPO' | 'NOVOS';

export interface MetaDiaria {
  tipo: MetaTipo;
  valor: number; // minutos (TEMPO) ou nº de cards novos (NOVOS)
}

export interface DailyPool {
  dueReviews: number; // cards de flashcard vencidos
  dueFeynman: number; // re-explicações Feynman vencidas
  newAvailable: number; // cards novos disponíveis na ordem do roadmap
  secPerReview: number; // média real do histórico (fallback no chamador)
}

export interface DailyTarget {
  reviews: number;
  feynman: number;
  novos: number;
  estMinutes: number;
  note: string | null; // aviso ao usuário (ex.: backlog alto)
}

// Um card novo rende mais que uma revisão (leitura+primeira memorização); uma
// re-explicação Feynman é uma atividade mais longa. Fatores sobre secPerReview.
const NEW_FACTOR = 1.6;
const FEYNMAN_SECONDS = 180;

const BACKLOG_NOTE = 'Backlog alto: hoje foque nas revisões — os novos entram quando ele baixar.';

function backboneSeconds(pool: DailyPool): number {
  return pool.dueReviews * pool.secPerReview + pool.dueFeynman * FEYNMAN_SECONDS;
}

// Quantos novos cabem: pela contagem (NOVOS) ou pelo tempo restante (TEMPO).
function novosCount(pool: DailyPool, meta: MetaDiaria): number {
  if (meta.tipo === 'NOVOS')
    return Math.min(pool.newAvailable, Math.max(0, Math.floor(meta.valor)));
  const restante = meta.valor * 60 - backboneSeconds(pool);
  if (restante <= 0) return 0;
  return Math.min(pool.newAvailable, Math.floor(restante / (pool.secPerReview * NEW_FACTOR)));
}

/**
 * Monta o alvo do dia: revisões (card + Feynman) sempre entram; os novos preenchem a
 * meta restante. `note` avisa quando o backlog engoliu o tempo dos novos.
 * @example buildDailyTarget({ dueReviews: 32, dueFeynman: 2, newAvailable: 40, secPerReview: 20 }, { tipo: 'TEMPO', valor: 30 })
 */
export function buildDailyTarget(pool: DailyPool, meta: MetaDiaria): DailyTarget {
  const novos = novosCount(pool, meta);
  const seconds = backboneSeconds(pool) + novos * pool.secPerReview * NEW_FACTOR;
  const backlogChoked = meta.tipo === 'TEMPO' && novos === 0 && pool.newAvailable > 0;
  return {
    reviews: pool.dueReviews,
    feynman: pool.dueFeynman,
    novos,
    estMinutes: Math.round(seconds / 60),
    note: backlogChoked ? BACKLOG_NOTE : null,
  };
}
