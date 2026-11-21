import type { FlashcardItem, PlannedItem, QuestionItem, StudyPlan, TodayPlan } from "./study-plan.types";
import type { LocalSchedule } from "@/lib/srs-local";

export interface VaultPlanPool {
  cards: FlashcardItem[];
  questions: QuestionItem[];
  schedules: Record<string, LocalSchedule>;
}

interface VaultPlanQueue {
  today: TodayPlan;
  items: PlannedItem[];
}

function projectLocalPlan(plan: StudyPlan, remaining: number, perDay: number, now: Date): TodayPlan["projection"] {
  const daysNeeded = remaining === 0 ? 0 : perDay > 0 ? Math.ceil(remaining / perDay) : null;
  const finish = new Date(now);
  if (daysNeeded !== null) finish.setDate(finish.getDate() + Math.max(0, daysNeeded - 1));
  const projectedFinish = daysNeeded === null ? null : finish.toISOString();
  const deadline = plan.dataAlvo ? new Date(`${plan.dataAlvo.slice(0, 10)}T23:59:59.999`).getTime() : null;
  const onTrack = deadline === null || daysNeeded === null ? null : finish.getTime() <= deadline;
  const left = deadline === null ? 1 : Math.max(1, Math.ceil((deadline - now.getTime()) / 86_400_000));
  return { daysNeeded, projectedFinish, onTrack, suggestedPerDay: deadline === null ? null : Math.ceil(remaining / left) };
}

function weavePlanItems(cards: FlashcardItem[], questions: QuestionItem[]): PlannedItem[] {
  const items: PlannedItem[] = [];
  for (let index = 0; index < Math.max(cards.length, questions.length); index++) {
    if (cards[index]) items.push(cards[index]);
    if (questions[index]) items.push(questions[index]);
  }
  return items;
}

/** Builds today's local queue with due cards first in the card stream.
 * @example const { today, items } = buildVaultPlanQueue(plan, pool, new Date())
 */
export function buildVaultPlanQueue(plan: StudyPlan, pool: VaultPlanPool, now: Date): VaultPlanQueue {
  const due = pool.cards.filter(({ id }) => Date.parse(pool.schedules[id]?.proximaRevisao ?? "") <= now.getTime());
  const fresh = pool.cards.filter(({ id }) => !pool.schedules[id]);
  const available = fresh.length + pool.questions.length;
  const budget = plan.metaTipo === "TEMPO" ? Math.max(0, plan.metaValor * 2 - due.length) : plan.metaValor;
  const newItems = weavePlanItems(fresh, pool.questions).slice(0, budget);
  const items = [...due, ...newItems];
  const today = {
    plan, newAvailable: available,
    target: {
      reviews: due.length, novos: newItems.length, feynman: 0,
      estMinutes: Math.ceil(items.length / 2), note: null,
    },
    projection: projectLocalPlan(plan, available, budget, now),
  };
  return { today, items };
}
