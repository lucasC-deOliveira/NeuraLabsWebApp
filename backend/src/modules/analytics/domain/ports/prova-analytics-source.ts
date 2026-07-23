// Read port para o analytics de questões/provas: linhas cruas que os serviços de
// domínio agregam. Só o adapter conhece o Prisma.

export interface AttemptRow {
  provaId: string;
  titulo: string;
  dataFim: Date;
  acertos: number;
  total: number;
}

// Estatística por questão (vida toda) agregada das respostas.
export interface QuestionStatRow {
  enunciado: string;
  tipo: string;
  total: number;
  wrong: number;
}

// provaId opcional restringe a uma prova específica.
export interface ProvaAnalyticsSource {
  // Tentativas de prova do usuário no período (>= since), com o título da prova.
  attempts(userId: string, since: Date, provaId?: string): Promise<AttemptRow[]>;
  // Total x erros por questão respondida no período (hardest + acurácia por tipo).
  questionStats(userId: string, since: Date, provaId?: string): Promise<QuestionStatRow[]>;
}

export const PROVA_ANALYTICS_SOURCE = Symbol('PROVA_ANALYTICS_SOURCE');
