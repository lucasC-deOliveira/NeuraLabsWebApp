// Fonte dos sinais de CRIAÇÃO de conteúdo (o eixo Construtor da gamificação).
// Só o adapter conhece o Prisma; as derivações (ofensiva, badges) ficam puras.
// Cada tipo tem data_criacao + id_usuario no banco, então é tudo datável por usuário.
export type ContentKind =
  | 'flashcard'
  | 'questao'
  | 'baralho'
  | 'prova'
  | 'edital'
  | 'feynman'
  | 'nota'
  | 'node';

export type CreatedTotals = Record<ContentKind, number>;

// Uma criação datada — só a data importa para a ofensiva (reusa studyStreak).
export interface CreationEvent {
  data: Date;
}

export interface ContentCreationSource {
  creationEvents(userId: string, since: Date): Promise<CreationEvent[]>;
  creationTotals(userId: string): Promise<CreatedTotals>;
}

export const CONTENT_CREATION_SOURCE = Symbol('CONTENT_CREATION_SOURCE');
