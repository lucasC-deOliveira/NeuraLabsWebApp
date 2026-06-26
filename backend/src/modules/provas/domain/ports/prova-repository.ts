import type {
  CreateProvaFromParsedInput,
  CreateProvaInput,
  OwnedProvaDetail,
  ProvaSummary,
  UpdateProvaPatch,
} from '../prova';

// Persistence port for provas (exams) and their ordered questions.
export interface ProvaRepository {
  create(userId: string, input: CreateProvaInput): Promise<string>;
  createFromParsed(userId: string, input: CreateProvaFromParsedInput): Promise<string>;
  listByUser(userId: string): Promise<ProvaSummary[]>;
  findDetail(id: string): Promise<OwnedProvaDetail | null>;
  findOwner(id: string): Promise<{ usuarioId: string } | null>;
  update(id: string, patch: UpdateProvaPatch): Promise<void>;
  delete(id: string): Promise<void>;
}

export const PROVA_REPOSITORY = Symbol('PROVA_REPOSITORY');
