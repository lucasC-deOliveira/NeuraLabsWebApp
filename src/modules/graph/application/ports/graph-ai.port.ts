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
export interface MissingPrereq {
  nome: string;
  tipo: string;
  motivo: string;
  shouldConnectTo: Array<{ id: string; nome: string }>;
}
export interface NodeInsight {
  categoria: string;
  titulo: string;
  descricao: string;
  tipoNo: string;
  relacao: string;
}
export interface NodeInsightsResult {
  nodeNome: string;
  nodeTipo: string;
  insights: NodeInsight[];
}
export interface InsightToAdd {
  tipoNo: string;
  relacao: string;
  titulo: string;
  descricao?: string;
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
  detectMissingPrerequisites(grafoId: string): Promise<{ prerequisites: MissingPrereq[] }>;
  addMissingPrerequisite(grafoId: string, nome: string, tipo: string, connectToIds: string[]): Promise<{ nodeId: string }>;
  generateNodeInsights(grafoId: string, nodeId: string): Promise<NodeInsightsResult>;
  addInsightsToGraph(grafoId: string, sourceNodeId: string, insights: InsightToAdd[]): Promise<{ added: number }>;
  generateCommunitySummary(grafoId: string, nodeIds: string[]): Promise<{ titulo: string; resumo: string }>;
}
