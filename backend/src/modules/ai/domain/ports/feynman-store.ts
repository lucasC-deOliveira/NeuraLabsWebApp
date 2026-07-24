import type { FeynmanAlvoTipo } from './feynman-context-source';

export interface FeynmanAttemptInput {
  userId: string;
  alvoTipo: FeynmanAlvoTipo;
  alvoId: string;
  texto: string;
  clareza: number;
  lacunas: unknown; // FeynmanGap[] serializado como JSON
  jargao: unknown; // string[] serializado como JSON
}

export interface FeynmanStateInput {
  userId: string;
  alvoTipo: FeynmanAlvoTipo;
  alvoId: string;
  ultimaClareza: number;
  intervalo: number;
  proximaRevisao: Date;
}

// Persistência da Feynman: histórico de tentativas + estado (agendamento) por alvo.
export interface FeynmanStore {
  saveAttempt(input: FeynmanAttemptInput): Promise<void>;
  currentInterval(userId: string, alvoTipo: FeynmanAlvoTipo, alvoId: string): Promise<number>;
  upsertState(input: FeynmanStateInput): Promise<void>;
}

export const FEYNMAN_STORE = Symbol('FEYNMAN_STORE');
