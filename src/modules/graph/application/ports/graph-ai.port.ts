// Port (application boundary) for the graph AI features over the HTTP edge.
// Only infra/ implements it (ACL over @/lib/ai-api). No React, no @/lib here.

export interface LearningStep {
  nodeId: string;
  nome: string;
  tipo: string;
  motivo: string;
}

export interface NotaRelationSuggestion {
  nodeId: string;
  nodeTipo: "ASSUNTO" | "TOPICO" | "CONCEITO";
  nodeNome: string;
  relacao: string;
  motivo: string;
}

export interface GraphAiPort {
  generateLearningPath(grafoId: string): Promise<{ steps: LearningStep[] }>;
  suggestNotaRelations(grafoId: string, titulo: string, conteudo: string): Promise<NotaRelationSuggestion[]>;
}
