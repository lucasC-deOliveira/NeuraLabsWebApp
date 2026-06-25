import type { ExistingCurriculum } from '../services/curriculum-plan';

// Read/write port for materializing a curriculum (subjects → topics → concepts)
// and saving notes into the user's library.
export interface CurriculumRepository {
  loadExisting(userId: string): Promise<ExistingCurriculum>;
  createAssunto(userId: string, nome: string): Promise<string>;
  createTopico(userId: string, assuntoId: string, nome: string): Promise<string>;
  createConceito(userId: string, topicoId: string, nome: string): Promise<string>;
  createNota(userId: string, titulo: string, conteudo: string): Promise<string>;
}

export const CURRICULUM_REPOSITORY = Symbol('CURRICULUM_REPOSITORY');
