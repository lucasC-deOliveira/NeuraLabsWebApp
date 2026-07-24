import type { FeynmanAlvoTipo } from './feynman-context-source';

export interface FeynmanNoteInput {
  userId: string;
  alvoTipo: FeynmanAlvoTipo;
  alvoId: string;
  texto: string;
}

/**
 * Publica uma explicação Feynman salva como NOTA (subtipo EXPLICACAO) ligada ao alvo,
 * para ela renderizar imediatamente no grafo de conhecimento. Idempotente por
 * (usuário, alvo): re-salvar atualiza a mesma nota, não cria outra.
 */
export interface FeynmanNotePublisher {
  publish(input: FeynmanNoteInput): Promise<void>;
}

export const FEYNMAN_NOTE_PUBLISHER = Symbol('FEYNMAN_NOTE_PUBLISHER');
