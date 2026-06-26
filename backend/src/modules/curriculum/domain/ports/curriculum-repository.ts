import type { CreateConceptInput, CreatedNode } from '../curriculum-views';

// Write port for the curriculum hierarchy. createTopico/createConceito enforce
// that the parent belongs to the user (throwing the matching domain error).
export interface CurriculumRepository {
  createAssunto(userId: string, nome: string): Promise<CreatedNode>;
  createTopico(userId: string, nome: string, assuntoId: string): Promise<CreatedNode>;
  createConceito(userId: string, input: CreateConceptInput): Promise<CreatedNode>;
}

export const CURRICULUM_REPOSITORY = Symbol('CURRICULUM_REPOSITORY');
