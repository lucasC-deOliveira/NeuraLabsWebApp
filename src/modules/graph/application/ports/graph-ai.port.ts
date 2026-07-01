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

export interface AutoLinkSuggestion {
  sourceId: string;
  targetId: string;
  sourceNome: string;
  targetNome: string;
  relacao: string;
  motivo: string;
}

export interface AppliedEdge {
  sourceId: string;
  targetId: string;
  relacao: string;
}

export interface GraphAiPort {
  generateLearningPath(grafoId: string): Promise<{ steps: LearningStep[] }>;
  suggestNotaRelations(grafoId: string, titulo: string, conteudo: string): Promise<NotaRelationSuggestion[]>;
  autoLinkGraph(grafoId: string): Promise<{ suggestions: AutoLinkSuggestion[] }>;
  applyAutoLink(grafoId: string, edges: AppliedEdge[]): Promise<{ added: number }>;
}
