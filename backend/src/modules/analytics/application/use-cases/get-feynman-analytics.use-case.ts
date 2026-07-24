import { feynmanAnalytics } from '../../domain/services/feynman-clareza';
import { addDays } from '../../domain/services/date-key';
import type { FeynmanAnalyticsSource } from '../../domain/ports/feynman-analytics-source';
import type { FeynmanAnalytics } from '../../domain/feynman-analytics-views';

const DEFAULT_WINDOW_DAYS = 90;

/**
 * Reúne os analytics da Técnica Feynman do usuário: totais, clareza média e a
 * tendência de clareza no período (`days`, padrão 90).
 * @example useCase.execute('u1', 30)
 */
export class GetFeynmanAnalyticsUseCase {
  constructor(private readonly source: FeynmanAnalyticsSource) {}

  async execute(userId: string, days = DEFAULT_WINDOW_DAYS): Promise<FeynmanAnalytics> {
    const since = addDays(new Date(), -days);
    return feynmanAnalytics(await this.source.explicacoesSince(userId, since));
  }
}
