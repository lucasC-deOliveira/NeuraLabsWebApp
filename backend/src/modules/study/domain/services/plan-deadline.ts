import type { StudyPlan } from '../ports/study-plan-repository';

/**
 * The deadline the SRS should schedule against.
 *
 * A user can keep several plans and one card can sit in more than one of them, so
 * there is no single owning plan to ask. The nearest deadline still ahead wins:
 * compressing toward the closest exam is the safe direction, because it can only
 * pull a review earlier — never push one past a date the user cares about.
 *
 * Inactive plans and deadlines already past are ignored: a finished exam must not
 * keep squeezing the schedule forever.
 * @example nearestDeadline(plans, new Date())
 */
export function nearestDeadline(plans: readonly StudyPlan[], now: Date): Date | null {
  let nearest: Date | null = null;
  for (const plan of plans) {
    if (!plan.ativo || plan.dataAlvo === null || plan.dataAlvo <= now) continue;
    if (nearest === null || plan.dataAlvo < nearest) nearest = plan.dataAlvo;
  }
  return nearest;
}
