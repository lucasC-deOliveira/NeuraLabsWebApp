// Cache local do "plano de hoje", por plano — para reabrir/trocar de plano
// instantaneamente (stale-while-revalidate). Sobre o CacheStore unificado. TTL de
// 60s (igual ao cache do backend) como rede de segurança; salvar a config do plano
// ou concluir uma sessão invalida na hora. O payload é só string/número (datas vêm
// como ISO), então não precisa de revive.
import { cacheStore } from "@/modules/cache/infra/local-cache-store";
import type { CacheSlot } from "@/modules/cache/domain/cache-store";
import type { TodayPlan } from "@/lib/study-plan-api";

const tagOf = (planId: string): string => `study-plan.${planId}`;

function slotOf(planId: string): CacheSlot<TodayPlan> {
  return cacheStore.slot({
    key: `study.today.${planId}`,
    version: 1,
    ttlMs: 60_000,
    tags: [tagOf(planId)],
  });
}

export function loadCachedToday(planId: string): TodayPlan | null {
  return slotOf(planId).read();
}

export function saveCachedToday(planId: string, plan: TodayPlan): void {
  slotOf(planId).write(plan);
}

/** Invalida o "hoje" cacheado do plano — ao salvar a config ou concluir uma sessão. */
export function invalidateToday(planId: string): void {
  cacheStore.invalidateTag(tagOf(planId));
}
