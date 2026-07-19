import type { ConceptPrerequisites } from '../services/prerequisite-readiness';

// Read port: para os conceitos dados, quais são seus pré-requisitos (arestas
// PREREQUISITO no grafo) e o quanto o usuário domina cada um.
//
// Fica no contexto de estudo porque é a sessão que pergunta; quem responde é o
// grafo, atrás desta interface.
export interface PrerequisiteMasteryQuery {
  forConcepts(userId: string, conceptNames: string[]): Promise<ConceptPrerequisites>;
}

export const PREREQUISITE_MASTERY_QUERY = Symbol('PREREQUISITE_MASTERY_QUERY');
