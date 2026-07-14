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
  // Node types of the endpoints, used to group the relations by the connected
  // node's type. Optional: absent edges fall into an "unknown type" group.
  sourceType?: string;
  targetType?: string;
}

export interface DeckStats {
  total: number;
  novos: number;
  paraRevisar: number;
}
