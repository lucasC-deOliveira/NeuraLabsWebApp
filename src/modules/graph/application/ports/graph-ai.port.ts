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

export interface DuplicateNode {
  id: string;
  nome: string;
  tipo: string;
}
export interface DuplicateGroup {
  nodes: DuplicateNode[];
  sugestao: string;
}

export interface CompletenessAssessment {
  assuntoId: string;
  assuntoNome: string;
  score: number;
  wellCovered: string[];
  shallow: string[];
  missing: string[];
}
export interface GapItem {
  nome: string;
  tipo: "missing" | "shallow";
  assuntoId: string;
  assuntoNome: string;
}
export interface GeneratedContentCount {
  topicos: number;
  conceitos: number;
  notas: number;
  flashcards: number;
}

export interface GraphAiPort {
  generateLearningPath(grafoId: string): Promise<{ steps: LearningStep[] }>;
  suggestNotaRelations(grafoId: string, titulo: string, conteudo: string): Promise<NotaRelationSuggestion[]>;
  autoLinkGraph(grafoId: string): Promise<{ suggestions: AutoLinkSuggestion[] }>;
  applyAutoLink(grafoId: string, edges: AppliedEdge[]): Promise<{ added: number }>;
  detectDuplicates(grafoId: string): Promise<{ groups: DuplicateGroup[] }>;
  mergeDuplicates(grafoId: string, keepId: string, deleteIds: string[]): Promise<{ merged: number; edgesMoved: number }>;
  assessCompleteness(grafoId: string): Promise<{ assessments: CompletenessAssessment[] }>;
  fillKnowledgeGaps(grafoId: string, gaps: GapItem[]): Promise<GeneratedContentCount>;
}
