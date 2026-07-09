import type {
  CreateProvaFromParsedInput,
  CreateProvaInput,
  OwnedProvaDetail,
  ProvaSummary,
  StoredQuestaoImagem,
  UpdateProvaPatch,
} from '../prova';

// The created exam plus the ids of its questions, in the order they were parsed,
// so the caller can link each question into the knowledge graph.
export interface CreatedProva {
  provaId: string;
  questaoIds: string[];
}

// Persistence port for provas (exams) and their ordered questions.
export interface ProvaRepository {
  create(userId: string, input: CreateProvaInput): Promise<string>;
  createFromParsed(userId: string, input: CreateProvaFromParsedInput): Promise<CreatedProva>;
  listByUser(userId: string): Promise<ProvaSummary[]>;
  findDetail(id: string): Promise<OwnedProvaDetail | null>;
  findOwner(id: string): Promise<{ usuarioId: string } | null>;
  findImagem(id: string): Promise<StoredQuestaoImagem | null>;
  update(id: string, patch: UpdateProvaPatch): Promise<void>;
  delete(id: string): Promise<void>;
}

export const PROVA_REPOSITORY = Symbol('PROVA_REPOSITORY');
