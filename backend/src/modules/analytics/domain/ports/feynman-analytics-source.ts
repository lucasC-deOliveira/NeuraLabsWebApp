// Uma explicação Feynman do usuário (crua) para os analytics.
export interface FeynmanRow {
  data: Date;
  clareza: number;
  alvoTipo: string;
  alvoId: string;
}

export interface FeynmanAnalyticsSource {
  // Explicações do usuário a partir de `since` (tendência de clareza + totais).
  explicacoesSince(userId: string, since: Date): Promise<FeynmanRow[]>;
}

export const FEYNMAN_ANALYTICS_SOURCE = Symbol('FEYNMAN_ANALYTICS_SOURCE');
