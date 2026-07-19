// Quanto um card está "sabido" agora, a partir do seu estado SM-2 (dificuldade
// decaída pelo atraso). O cálculo vive no contexto do grafo, que o usa para
// propagar domínio; aqui ele entra como port para o estudo não importar o domínio
// de outro contexto — o bind é feito no módulo (mesmo padrão do RelationRulesPort).
export interface CardMasteryInput {
  dificuldade: number;
  intervalo: number;
  proximaRevisao: Date;
}

export interface CardMasteryCalculator {
  mastery(input: CardMasteryInput, nowMs: number): number;
}

export const CARD_MASTERY_CALCULATOR = Symbol('CARD_MASTERY_CALCULATOR');
