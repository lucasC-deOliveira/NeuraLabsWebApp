// Shared view types for the graph node properties panel.

export interface PropertiesNode {
  id: string;
  label: string;
  group: string;
  dominio: number;
  x: number;
  y: number;
  tipoReal: string;
  parentId?: string;
  pergunta?: string;
  prioridadeRevisao: number;
  isRoot?: boolean;
}

export interface PropertiesEdge {
  id: string;
  source: string;
  target: string;
  tipoRelacao: string;
  peso: number;
  sourceLabel: string;
  targetLabel: string;
}

export interface DeckStats {
  total: number;
  novos: number;
  paraRevisar: number;
}
