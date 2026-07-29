// Cache local da lista de planos de estudo — para a página de plano e o card da
// home abrirem instantâneos (stale-while-revalidate). Sobre o CacheStore unificado.
// O payload é só string/número, então não precisa de revive. Criar/salvar/remover
// um plano invalida a tag.
import { cacheStore } from "@/modules/cache/infra/local-cache-store";
import type { CacheSlot } from "@/modules/cache/domain/cache-store";
import type { StudyPlan } from "@/lib/study-plan-api";

const PLANS_TAG = "study-plans";

const slot: CacheSlot<StudyPlan[]> = cacheStore.slot({
  key: "study.plans",
  version: 1,
  tags: [PLANS_TAG],
});

export function loadCachedPlans(): StudyPlan[] | null {
  return slot.read();
}

export function saveCachedPlans(plans: StudyPlan[]): void {
  slot.write(plans);
}

/** Invalida a lista cacheada de planos — ao criar/salvar/remover um plano. */
export function invalidatePlans(): void {
  cacheStore.invalidateTag(PLANS_TAG);
}
