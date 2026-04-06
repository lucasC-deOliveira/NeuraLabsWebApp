import type { SessaoEstudo, RevisaoInput } from "../entities/estudo";
import type { Assunto, Topico, Conceito } from "../entities/subjects";

export interface EstudoRepository {
  startSession(userId: string): Promise<string>;
  endSession(sessionId: string): Promise<void>;
  submitReview(review: RevisaoInput & { sessaoId: string }): Promise<void>;
  getCardsForReview(userId: string): Promise<unknown[]>;
  getNewCardsForReview(userId: string, limit?: number): Promise<unknown[]>;
  getSessionHistory(userId: string): Promise<SessaoEstudo[]>;
}

export interface DisciplinaRepository {
  saveAssunto(assunto: Assunto): Promise<{ id: string }>;
  getAssuntos(): Promise<Assunto[]>;
  saveTopico(topico: Topico): Promise<{ id: string }>;
  getTopicos(assuntoId: string): Promise<Topico[]>;
  saveConceito(conceito: Conceito): Promise<{ id: string }>;
  getConceitos(topicoId: string): Promise<Conceito[]>;
}
